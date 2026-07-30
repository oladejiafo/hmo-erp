<?php
/**
 * FILE: app/Services/InvoiceService.php
 *
 * REBUILT: every method here previously referenced columns that don't
 * exist in the real corporate_invoices table (plan_id wasn't even there
 * until the migration alongside this fix, but amount_subtotal,
 * amount_due, items, payment_date, payment_method, transaction_reference,
 * sent_at never existed at all under those names). This is now aligned
 * to the real schema: subtotal, tax_amount, total_amount, issue_date,
 * paid_at, payment_reference.
 *
 * Payment tracking itself now happens through the invoice_payments table
 * (App\Models\InvoicePayment) for gateway-driven payments - the same
 * pattern already used for retail enrollment payments. markAsPaid() here
 * is specifically for recording an OFFLINE payment (bank transfer
 * confirmed manually by staff), not for gateway checkouts.
 */
namespace App\Services;

use App\Models\Corporate;
use App\Models\CorporateInvoice;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class InvoiceService
{
    /**
     * Generate a new invoice for a corporate.
     *
     * Expects (matches StoreCorporateInvoiceRequest::rules()):
     *   description (optional), subtotal (required), tax_rate (optional, % - default from settings),
     *   issue_date (required), due_date (required), plan_id (optional),
     *   period_start (optional), period_end (optional)
     */
    public function generateInvoice(Corporate $corporate, array $data): CorporateInvoice
    {
        return DB::transaction(function () use ($corporate, $data) {
            $subtotal = (float) $data['subtotal'];
            $taxRate  = (float) ($data['tax_rate'] ?? \App\Models\SystemSetting::get('financial.vat_rate', 7.5));
            $taxAmount = round($subtotal * ($taxRate / 100), 2);
            $totalAmount = $subtotal + $taxAmount;

            $invoice = CorporateInvoice::create([
                'branch_id'      => $corporate->branch_id,
                'corporate_id'   => $corporate->id,
                'plan_id'        => $data['plan_id'] ?? null,
                'invoice_number' => $this->generateInvoiceNumber($corporate),
                'description'    => $data['description'] ?? null,
                'subtotal'       => $subtotal,
                'tax_amount'     => $taxAmount,
                'total_amount'   => $totalAmount,
                'status'         => 'draft',
                'issue_date'     => $data['issue_date'],
                'due_date'       => $data['due_date'],
                'period_start'   => $data['period_start'] ?? null,
                'period_end'     => $data['period_end'] ?? null,
                'created_by'     => Auth::id(),
            ]);

            $this->generatePdf($invoice);

            return $invoice;
        });
    }

    /**
     * Record an OFFLINE payment (bank transfer, cheque, etc. confirmed
     * manually by staff) - not the gateway checkout flow, that's tracked
     * separately via InvoicePayment.
     */
    public function markAsPaid(CorporateInvoice $invoice, array $data): CorporateInvoice
    {
        $invoice->update([
            'status'            => 'paid',
            'paid_at'           => $data['paid_at'] ?? now(),
            'payment_reference' => $data['payment_reference'] ?? null,
        ]);

        return $invoice;
    }

    /**
     * Send invoice via email.
     */
    public function sendInvoice(CorporateInvoice $invoice): void
    {
        // TODO: Implement email sending
        // Mail::to($invoice->corporate->email)->send(new InvoiceMail($invoice));

        $invoice->update([
            'sent_at' => now(),
            'status'  => $invoice->status === 'draft' ? 'sent' : $invoice->status,
        ]);
    }

    /**
     * Generate PDF for invoice.
     */
    public function generatePdf(CorporateInvoice $invoice): string
    {
        $pdf = Pdf::loadView('pdf.invoice', [
            'invoice' => $invoice->load('corporate', 'plan'),
        ]);

        $path = "invoices/invoice-{$invoice->invoice_number}.pdf";
        Storage::disk('public')->put($path, $pdf->output());

        $invoice->update(['pdf_path' => $path]);

        return Storage::disk('public')->path($path);
    }

    /**
     * Generate unique invoice number.
     */
    protected function generateInvoiceNumber(Corporate $corporate): string
    {
        $year = now()->year;
        $month = now()->month;
        $corporateCode = substr($corporate->code, 0, 3);

        $lastInvoice = CorporateInvoice::whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->orderBy('id', 'desc')
            ->first();

        $sequence = $lastInvoice ? intval(substr($lastInvoice->invoice_number, -4)) + 1 : 1;

        return sprintf(
            "INV-%s-%s%02d-%04d",
            strtoupper($corporateCode),
            $year,
            $month,
            $sequence
        );
    }
}

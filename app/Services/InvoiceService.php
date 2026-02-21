<?php

namespace App\Services;

use App\Models\Corporate;
use App\Models\CorporateInvoice;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class InvoiceService
{
    /**
     * Generate a new invoice for a corporate
     */
    public function generateInvoice(Corporate $corporate, array $data): CorporateInvoice
    {
        return DB::transaction(function () use ($corporate, $data) {
            // Calculate totals
            $subtotal = collect($data['items'])->sum('amount');
            $tax = $subtotal * 0.075; // 7.5% VAT
            $total = $subtotal + $tax;

            $invoice = CorporateInvoice::create([
                'corporate_id' => $corporate->id,
                'plan_id' => $data['plan_id'],
                'invoice_number' => $this->generateInvoiceNumber($corporate),
                'period_start' => $data['period_start'],
                'period_end' => $data['period_end'],
                'invoice_date' => now(),
                'due_date' => $data['due_date'],
                'amount_subtotal' => $subtotal,
                'tax_amount' => $tax,
                'amount_due' => $total,
                'items' => $data['items'],
                'description' => $data['description'] ?? null,
                'status' => 'sent',
                'created_by' => Auth::id(),
            ]);

            // Generate PDF
            $this->generatePdf($invoice);

            return $invoice;
        });
    }

    /**
     * Mark invoice as paid
     */
    public function markAsPaid(CorporateInvoice $invoice, array $data): CorporateInvoice
    {
        $invoice->update([
            'status' => 'paid',
            'payment_date' => $data['payment_date'],
            'payment_method' => $data['payment_method'],
            'transaction_reference' => $data['transaction_reference'],
            'notes' => $data['notes'] ?? null,
        ]);

        return $invoice;
    }

    /**
     * Send invoice via email
     */
    public function sendInvoice(CorporateInvoice $invoice): void
    {
        // TODO: Implement email sending
        // Mail::to($invoice->corporate->email)->send(new InvoiceMail($invoice));
        
        $invoice->update(['sent_at' => now()]);
    }

    /**
     * Generate PDF for invoice
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
     * Generate unique invoice number
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
        
        return sprintf("INV-%s-%s%02d-%04d", 
            strtoupper($corporateCode),
            $year,
            $month,
            $sequence
        );
    }
}
<?php

namespace App\Http\Controllers\Corporate;

use App\Http\Controllers\Controller;
use App\Http\Requests\Corporate\StoreCorporateInvoiceRequest;
use App\Http\Requests\Corporate\UpdateInvoiceStatusRequest;
use App\Http\Resources\CorporateInvoiceResource;
use App\Models\Corporate;
use App\Models\CorporateInvoice;
use App\Services\InvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Models\SystemSetting;

class CorporateInvoiceController extends Controller
{
    public function __construct(
        protected InvoiceService $invoiceService
    ) {}

    /**
     * Get all invoices for a corporate
     * 
     * @param Request $request
     * @param Corporate $corporate
     * @return JsonResponse
     */
    public function index(Request $request, Corporate $corporate): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('corporates.invoices');
        
        $invoices = $corporate->invoices()
            ->with(['plan'])
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->from_date, fn($q, $d) => $q->where('invoice_date', '>=', $d))
            ->when($request->to_date, fn($q, $d) => $q->where('invoice_date', '<=', $d))
            ->orderByDesc('invoice_date')
            ->paginate($request->per_page ?? 20);

        return response()->json([
            'data' => CorporateInvoiceResource::collection($invoices),
            'meta' => [
                'current_page' => $invoices->currentPage(),
                'last_page' => $invoices->lastPage(),
                'per_page' => $invoices->perPage(),
                'total' => $invoices->total(),
                'total_outstanding' => $corporate->invoices()
                    ->whereIn('status', ['sent', 'overdue'])
                    ->sum('amount_due'),
            ],
        ]);
    }

    /**
     * Generate a new invoice for a corporate
     * 
     * @param StoreCorporateInvoiceRequest $request
     * @param Corporate $corporate
     * @return JsonResponse
     */
    public function store(StoreCorporateInvoiceRequest $request, Corporate $corporate): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('corporates.invoices');
        
        $invoice = $this->invoiceService->generateInvoice($corporate, $request->validated());

        return response()->json([
            'message' => 'Invoice generated successfully',
            'data' => new CorporateInvoiceResource($invoice),
        ], 201);
    }

    /**
     * Get single invoice
     * 
     * @param Corporate $corporate
     * @param CorporateInvoice $invoice
     * @return JsonResponse
     */
    public function show(Corporate $corporate, CorporateInvoice $invoice): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('corporates.invoices');
        
        // Ensure invoice belongs to corporate
        if ($invoice->corporate_id !== $corporate->id) {
            return response()->json(['message' => 'Invoice not found for this corporate'], 404);
        }

        return response()->json([
            'data' => new CorporateInvoiceResource($invoice->load('plan', 'payments')),
        ]);
    }

    /**
     * Mark invoice as paid
     * 
     * @param UpdateInvoiceStatusRequest $request
     * @param Corporate $corporate
     * @param CorporateInvoice $invoice
     * @return JsonResponse
     */
    public function markPaid(UpdateInvoiceStatusRequest $request, Corporate $corporate, CorporateInvoice $invoice): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('corporates.invoices');
        
        // Ensure invoice belongs to corporate
        if ($invoice->corporate_id !== $corporate->id) {
            return response()->json(['message' => 'Invoice not found for this corporate'], 404);
        }

        $invoice = $this->invoiceService->markAsPaid($invoice, $request->validated());

        return response()->json([
            'message' => 'Invoice marked as paid',
            'data' => new CorporateInvoiceResource($invoice),
        ]);
    }

    /**
     * Send invoice to corporate via email
     * 
     * @param Corporate $corporate
     * @param CorporateInvoice $invoice
     * @return JsonResponse
     */
    public function send(Corporate $corporate, CorporateInvoice $invoice): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('corporates.invoices');
        
        // Ensure invoice belongs to corporate
        if ($invoice->corporate_id !== $corporate->id) {
            return response()->json(['message' => 'Invoice not found for this corporate'], 404);
        }

        $this->invoiceService->sendInvoice($invoice);

        return response()->json([
            'message' => 'Invoice sent successfully',
        ]);
    }

    /**
     * Generate invoice for corporate
     */
    public function generateInvoice(Corporate $corporate, array $data): CorporateInvoice
    {
        // Calculate amounts
        $subtotal = $data['amount'] ?? $this->calculateSubtotal($corporate, $data);
        
        // Get tax rate from settings or use default
        $taxRate = $data['tax_rate'] ?? SystemSetting::get('financial.vat_rate', 7.5);
        
        $taxAmount = $subtotal * ($taxRate / 100);
        $totalAmount = $subtotal + $taxAmount;

        // Generate invoice number
        $invoiceNumber = $this->generateInvoiceNumber();

        // Create invoice
        $invoice = CorporateInvoice::create([
            'corporate_id' => $corporate->id,
            'plan_id' => $data['plan_id'] ?? $corporate->current_plan_id,
            'invoice_number' => $invoiceNumber,
            'invoice_date' => now(),
            'due_date' => now()->addDays($data['payment_terms'] ?? 30),
            'period_start' => $data['period_start'] ?? now()->startOfMonth(),
            'period_end' => $data['period_end'] ?? now()->endOfMonth(),
            'subtotal' => $subtotal,
            'tax_rate' => $taxRate,
            'tax_amount' => $taxAmount,
            'total_amount' => $totalAmount,
            'amount_due' => $totalAmount,
            'status' => 'draft',
            'metadata' => $data['metadata'] ?? [],
        ]);

        // Generate invoice items if provided
        if (!empty($data['items'])) {
            $this->createInvoiceItems($invoice, $data['items']);
        }

        return $invoice;
    }
    
    /**
     * Download invoice PDF
     * 
     * @param Corporate $corporate
     * @param CorporateInvoice $invoice
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse|JsonResponse
     */
    public function download(Corporate $corporate, CorporateInvoice $invoice)
    {
        /** @disregard P1013 */
        $this->authorize('corporates.invoices');
        
        // Ensure invoice belongs to corporate
        if ($invoice->corporate_id !== $corporate->id) {
            return response()->json(['message' => 'Invoice not found for this corporate'], 404);
        }

        $pdfPath = $this->invoiceService->generatePdf($invoice);

        return response()->download($pdfPath, "invoice-{$invoice->invoice_number}.pdf")->deleteFileAfterSend();
    }
}
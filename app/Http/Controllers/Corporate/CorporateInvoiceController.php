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
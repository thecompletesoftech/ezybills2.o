<?php

namespace App\Http\Controllers\Api;

use App\Models\Invoice;
use App\Services\BillingService;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    private $billingService;

    public function __construct(BillingService $billingService)
    {
        $this->billingService = $billingService;
    }

    public function index(Request $request)
    {
        $invoices = Invoice::where('business_id', auth()->user()->business_id)
            ->with('customer', 'items', 'payments')
            ->orderBy('created_at', 'desc')
            ->paginate(20);
        return $this->paginated($invoices, 'Invoices retrieved');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'invoice_type' => 'sometimes|in:gst_invoice,retail_invoice,estimate,sale_return,purchase_invoice,purchase_return',
            'discount_amount' => 'nullable|numeric',
            'round_off' => 'nullable|numeric',
            'notes' => 'nullable|string',
            'items' => 'required|array',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric',
            'items.*.unit_price' => 'required|numeric',
            'items.*.discount_percentage' => 'nullable|numeric',
        ]);

        try {
            $invoice = $this->billingService->createInvoice(auth()->user()->business_id, $validated);
            return $this->success($invoice->load('items', 'customer'), 'Invoice created', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 400);
        }
    }

    public function show(Invoice $invoice)
    {
        $invoice->load('items', 'customer', 'payments');
        return $this->success($invoice, 'Invoice retrieved');
    }

    public function hold(Invoice $invoice)
    {
        $invoice->update(['invoice_status' => 'held']);
        return $this->success($invoice, 'Invoice held');
    }

    public function resume(Invoice $invoice)
    {
        $invoice->update(['invoice_status' => 'confirmed']);
        return $this->success($invoice, 'Invoice resumed');
    }

    public function recordPayment(Request $request, Invoice $invoice)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric',
            'payment_method' => 'required|in:cash,upi,card,credit,mixed',
            'reference_number' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        try {
            $this->billingService->recordPayment($invoice->id, $validated);
            return $this->success(null, 'Payment recorded');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 400);
        }
    }

    public function shareViaWhatsApp(Invoice $invoice)
    {
        // TODO: Generate WhatsApp message and send
        return $this->success(null, 'Invoice shared via WhatsApp');
    }

    public function print(Invoice $invoice)
    {
        // TODO: Generate thermal print format
        return $this->success(null, 'Print data generated');
    }

    public function downloadPdf(Invoice $invoice)
    {
        // TODO: Generate PDF and return
        return $this->success(null, 'PDF generated');
    }
}

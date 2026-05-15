<?php

namespace App\Http\Controllers\Api;

use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Services\InventoryService;
use Illuminate\Http\Request;

class PurchaseController extends Controller
{
    public function __construct(private InventoryService $inventoryService) {}

    public function index(Request $request)
    {
        $purchases = Purchase::where('business_id', auth()->user()->business_id)
            ->with('supplier', 'items.product')
            ->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 20));
        return $this->paginated($purchases, 'Purchases retrieved');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id'               => 'required|exists:suppliers,id',
            'notes'                     => 'nullable|string',
            'items'                     => 'required|array|min:1',
            'items.*.product_id'        => 'required|exists:products,id',
            'items.*.quantity'          => 'required|numeric|min:0.01',
            'items.*.unit_price'        => 'required|numeric|min:0',
            'items.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'items.*.tax_percentage'    => 'nullable|numeric|min:0',
        ]);

        $businessId = auth()->user()->business_id;
        $subtotal   = 0;
        $taxTotal   = 0;

        $purchaseNumber = 'PO' . str_pad(
            Purchase::where('business_id', $businessId)->count() + 1,
            6, '0', STR_PAD_LEFT
        );

        $purchase = Purchase::create([
            'business_id'     => $businessId,
            'supplier_id'     => $validated['supplier_id'],
            'purchase_number' => $purchaseNumber,
            'purchase_date'   => now(),
            'subtotal'        => 0,
            'tax_amount'      => 0,
            'total_amount'    => 0,
            'notes'           => $validated['notes'] ?? null,
        ]);

        foreach ($validated['items'] as $item) {
            $qty        = (float) $item['quantity'];
            $unitPrice  = (float) $item['unit_price'];
            $discPct    = (float) ($item['discount_percentage'] ?? 0);
            $taxPct     = (float) ($item['tax_percentage'] ?? 0);
            $lineBase   = $qty * $unitPrice;
            $discAmt    = $lineBase * $discPct / 100;
            $taxAmt     = ($lineBase - $discAmt) * $taxPct / 100;
            $lineTotal  = $lineBase - $discAmt + $taxAmt;

            PurchaseItem::create([
                'purchase_id'          => $purchase->id,
                'product_id'           => $item['product_id'],
                'quantity'             => $qty,
                'unit_price'           => $unitPrice,
                'discount_percentage'  => $discPct,
                'discount_amount'      => $discAmt,
                'tax_percentage'       => $taxPct,
                'tax_amount'           => $taxAmt,
                'line_total'           => $lineTotal,
            ]);

            $subtotal += $lineBase;
            $taxTotal += $taxAmt;

            // Update stock with WAC
            $this->inventoryService->addStockWithWAC(
                $item['product_id'],
                $businessId,
                $qty,
                $unitPrice,
                'purchase',
                'purchase',
                $purchase->id
            );
        }

        $purchase->update([
            'subtotal'     => $subtotal,
            'tax_amount'   => $taxTotal,
            'total_amount' => $subtotal + $taxTotal,
        ]);

        return $this->success(
            $purchase->load('supplier', 'items.product'),
            'Purchase recorded',
            201
        );
    }

    public function show(Purchase $purchase)
    {
        $purchase->load('supplier', 'items.product', 'payments');
        return $this->success($purchase, 'Purchase retrieved');
    }

    public function recordPayment(Request $request, Purchase $purchase)
    {
        $validated = $request->validate([
            'amount'         => 'required|numeric|min:0.01',
            'payment_method' => 'required|in:cash,upi,card,credit,cheque',
            'notes'          => 'nullable|string',
        ]);

        // Update payment status
        $totalPaid = $purchase->payments()->sum('amount') + $validated['amount'];
        $status = $totalPaid >= $purchase->total_amount ? 'paid' : 'partially_paid';
        $purchase->update(['payment_status' => $status]);

        return $this->success(null, 'Payment recorded');
    }
}

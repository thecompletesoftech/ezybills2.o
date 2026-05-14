<?php

namespace App\Http\Controllers\Api;

use App\Models\Purchase;
use Illuminate\Http\Request;

class PurchaseController extends Controller
{
    public function index()
    {
        $purchases = Purchase::where('business_id', auth()->user()->business_id)
            ->with('supplier', 'items')
            ->paginate(20);
        return $this->paginated($purchases, 'Purchases retrieved');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'items' => 'required|array',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric',
            'items.*.unit_price' => 'required|numeric',
        ]);

        return $this->success([], 'Purchase created', 201);
    }

    public function show(Purchase $purchase)
    {
        $purchase->load('supplier', 'items', 'payments');
        return $this->success($purchase, 'Purchase retrieved');
    }

    public function recordPayment(Request $request, Purchase $purchase)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric',
            'payment_method' => 'required|string',
        ]);

        return $this->success(null, 'Payment recorded');
    }
}

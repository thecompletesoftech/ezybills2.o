<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;

class StockAlertController extends Controller
{
    public function index()
    {
        $businessId = auth()->user()->business_id;

        $products = Product::where('business_id', $businessId)
            ->with('stock', 'category', 'supplier')
            ->get()
            ->filter(fn($p) => $p->stock && $p->stock->current_stock <= $p->low_stock_threshold)
            ->values();

        $alerts = $products->map(fn($p) => [
            'id'                  => $p->id,
            'name'                => $p->name,
            'sku'                 => $p->sku,
            'current_stock'       => (float) $p->stock->current_stock,
            'low_stock_threshold' => (float) $p->low_stock_threshold,
            'category'            => $p->category?->name,
            'supplier'            => $p->supplier?->name,
            'status'              => $p->stock->current_stock <= 0 ? 'out_of_stock' : 'low_stock',
        ]);

        return $this->success($alerts, 'Stock alerts retrieved');
    }
}

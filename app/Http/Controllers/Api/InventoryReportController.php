<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;
use App\Models\Stock;
use Illuminate\Http\Request;

class InventoryReportController extends Controller
{
    public function inventory(Request $request)
    {
        $businessId = $request->user()->business_id;

        $stocks = Stock::where('business_id', $businessId)
            ->with('product:id,name,purchase_price,low_stock_threshold,business_id')
            ->get();

        $totalProducts  = $stocks->count();
        $inStock        = $stocks->where('current_stock', '>', 0)->count();
        $outOfStock     = $stocks->where('current_stock', '<=', 0)->count();

        $lowStock = $stocks->filter(function ($s) {
            $threshold = $s->product?->low_stock_threshold ?? 5;
            return $s->current_stock > 0 && $s->current_stock <= $threshold;
        });

        $stockValue = $stocks->sum(function ($s) {
            return (float) $s->current_stock * (float) ($s->product?->purchase_price ?? 0);
        });

        $lowStockItems = $lowStock->map(fn ($s) => [
            'product_id'   => $s->product_id,
            'product_name' => $s->product?->name,
            'current_stock' => (float) $s->current_stock,
            'threshold'    => $s->product?->low_stock_threshold ?? 5,
        ])->values();

        return $this->success([
            'total_products' => $totalProducts,
            'in_stock'       => $inStock,
            'low_stock'      => $lowStock->count(),
            'out_of_stock'   => $outOfStock,
            'stock_value'    => round($stockValue, 2),
            'low_stock_items' => $lowStockItems,
        ], 'Inventory report');
    }
}

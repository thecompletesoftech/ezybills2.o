<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Stock;
use App\Models\StockMovement;

class InventoryService
{
    public function addStock($productId, $businessId, $quantity, $type = 'stock_in', $referenceType = null, $referenceId = null)
    {
        $stock = Stock::firstOrCreate(
            ['product_id' => $productId, 'business_id' => $businessId],
            ['opening_stock' => 0, 'current_stock' => 0]
        );

        $stock->increment('current_stock', $quantity);

        StockMovement::create([
            'stock_id' => $stock->id,
            'product_id' => $productId,
            'business_id' => $businessId,
            'movement_type' => $type,
            'quantity' => $quantity,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
        ]);

        return $stock;
    }

    /**
     * Add stock and recalculate Weighted Average Cost on the product.
     * WAC = (old_stock × old_price + new_qty × new_price) / (old_stock + new_qty)
     */
    public function addStockWithWAC($productId, $businessId, $quantity, $unitCost, $type = 'purchase', $referenceType = null, $referenceId = null): Stock
    {
        $stock = Stock::firstOrCreate(
            ['product_id' => $productId, 'business_id' => $businessId],
            ['opening_stock' => 0, 'current_stock' => 0]
        );

        $product  = Product::find($productId);
        $oldQty   = (float) $stock->current_stock;
        $oldCost  = (float) $product->purchase_price;
        $newTotal = $oldQty + $quantity;

        $wac = $newTotal > 0
            ? (($oldQty * $oldCost) + ($quantity * $unitCost)) / $newTotal
            : $unitCost;

        $stock->increment('current_stock', $quantity);
        $product->update(['purchase_price' => round($wac, 4)]);

        StockMovement::create([
            'stock_id'       => $stock->id,
            'product_id'     => $productId,
            'business_id'    => $businessId,
            'movement_type'  => $type,
            'quantity'       => $quantity,
            'reference_type' => $referenceType,
            'reference_id'   => $referenceId,
        ]);

        return $stock->fresh();
    }

    public function removeStock($productId, $businessId, $quantity, $type = 'stock_out', $referenceType = null, $referenceId = null)
    {
        $stock = Stock::where('product_id', $productId)
            ->where('business_id', $businessId)
            ->first();

        if (!$stock || $stock->current_stock < $quantity) {
            throw new \Exception('Insufficient stock');
        }

        $stock->decrement('current_stock', $quantity);

        StockMovement::create([
            'stock_id' => $stock->id,
            'product_id' => $productId,
            'business_id' => $businessId,
            'movement_type' => $type,
            'quantity' => -$quantity,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
        ]);

        return $stock;
    }

    public function adjustStock($productId, $businessId, $newQuantity)
    {
        $stock = Stock::where('product_id', $productId)
            ->where('business_id', $businessId)
            ->first();

        if (!$stock) {
            $stock = Stock::create([
                'product_id' => $productId,
                'business_id' => $businessId,
                'opening_stock' => 0,
                'current_stock' => $newQuantity,
            ]);
        } else {
            $difference = $newQuantity - $stock->current_stock;
            $stock->update(['current_stock' => $newQuantity]);

            StockMovement::create([
                'stock_id' => $stock->id,
                'product_id' => $productId,
                'business_id' => $businessId,
                'movement_type' => 'adjustment',
                'quantity' => $difference,
            ]);
        }

        return $stock;
    }

    public function getLowStockProducts($businessId, $lowStockLevel = 10)
    {
        return Stock::where('business_id', $businessId)
            ->where('current_stock', '<=', $lowStockLevel)
            ->with('product')
            ->get();
    }

    public function getOutOfStockProducts($businessId)
    {
        return Stock::where('business_id', $businessId)
            ->where('current_stock', '<=', 0)
            ->with('product')
            ->get();
    }
}

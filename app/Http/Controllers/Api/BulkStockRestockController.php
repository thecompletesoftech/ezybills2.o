<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;
use App\Models\Stock;
use App\Models\StockMovement;
use Illuminate\Http\Request;

class BulkStockRestockController extends Controller
{
    public function sampleCsv(Request $request)
    {
        $businessId = auth()->user()->business_id;

        $products = Product::where('business_id', $businessId)
            ->with('stock')
            ->get(['id', 'name', 'sku']);

        $headers = ['product_id', 'sku', 'product_name', 'current_stock', 'quantity_to_add', 'purchase_price', 'note'];
        $csv     = implode(',', $headers) . "\n";

        foreach ($products as $p) {
            $current = $p->stock?->current_stock ?? 0;
            $csv .= implode(',', array_map(
                fn($v) => '"' . str_replace('"', '""', (string) $v) . '"',
                [$p->id, $p->sku ?? '', $p->name, $current, '', '', '']
            )) . "\n";
        }

        return response($csv, 200, [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="stock_restock_template.csv"',
        ]);
    }

    public function import(Request $request)
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt|max:2048']);

        $businessId = auth()->user()->business_id;
        $handle     = fopen($request->file('file')->getRealPath(), 'r');
        $headers    = array_map('trim', fgetcsv($handle));

        $results = ['updated' => 0, 'skipped' => [], 'errors' => []];
        $rowNum  = 1;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNum++;
            $data = array_combine($headers, array_pad($row, count($headers), ''));

            $productId  = trim($data['product_id'] ?? '');
            $qtyToAdd   = trim($data['quantity_to_add'] ?? '');
            $unitCost   = trim($data['purchase_price'] ?? '');
            $note       = trim($data['note'] ?? 'Bulk restock');

            if ($qtyToAdd === '' || (float) $qtyToAdd <= 0) {
                if ($qtyToAdd !== '') $results['skipped'][] = "Row $rowNum: quantity_to_add is 0 — skipped";
                continue;
            }

            $product = Product::where('business_id', $businessId)
                ->where('id', $productId)
                ->with('stock')
                ->first();

            if (!$product) {
                // Try by SKU
                $sku     = trim($data['sku'] ?? '');
                $product = $sku
                    ? Product::where('business_id', $businessId)->where('sku', $sku)->with('stock')->first()
                    : null;
            }

            if (!$product) {
                $results['errors'][] = "Row $rowNum: product not found (id=$productId)";
                continue;
            }

            $qty  = (float) $qtyToAdd;
            $cost = $unitCost !== '' ? (float) $unitCost : null;

            // Update stock (WAC)
            $stock = $product->stock ?? Stock::create([
                'product_id'  => $product->id,
                'business_id' => $businessId,
                'opening_stock' => 0,
                'current_stock' => 0,
            ]);

            $oldQty   = (float) $stock->current_stock;
            $oldCost  = (float) $product->purchase_price;
            $newTotal = $oldQty + $qty;

            if ($cost !== null && $newTotal > 0) {
                $wac = ($oldQty * $oldCost + $qty * $cost) / $newTotal;
                $product->update(['purchase_price' => round($wac, 2)]);
            }

            $stock->update(['current_stock' => $newTotal]);

            StockMovement::create([
                'stock_id'       => $stock->id,
                'product_id'     => $product->id,
                'business_id'    => $businessId,
                'movement_type'  => 'stock_in',
                'quantity'       => $qty,
                'reference_type' => 'bulk_restock',
                'reference_id'   => $product->id,
                'notes'          => ($note ?: 'Bulk restock') . ($cost ? " @ ₹$cost/unit" : ''),
            ]);

            $results['updated']++;
        }
        fclose($handle);

        return $this->success($results, "Restock complete: {$results['updated']} products updated");
    }
}

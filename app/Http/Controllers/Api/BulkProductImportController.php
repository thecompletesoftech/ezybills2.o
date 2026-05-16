<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\Unit;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BulkProductImportController extends Controller
{
    public function sampleCsv()
    {
        $headers = [
            'name', 'sku', 'barcode', 'category', 'selling_price', 'purchase_price',
            'gst_rate', 'unit', 'stock_quantity', 'low_stock_threshold', 'description', 'image_url',
        ];
        $sample = [
            ['Basmati Rice 1kg', 'RICE001', '', 'Groceries', '120', '95', '5', 'KG', '50', '10', 'Premium quality', ''],
            ['Sunflower Oil 1L', 'OIL001', '', 'Groceries', '150', '120', '5', 'LTR', '30', '5', '', ''],
        ];

        $csv = implode(',', $headers) . "\n";
        foreach ($sample as $row) {
            $csv .= implode(',', array_map(fn($v) => '"' . str_replace('"', '""', $v) . '"', $row)) . "\n";
        }

        return response($csv, 200, [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="product_import_sample.csv"',
        ]);
    }

    public function import(Request $request)
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt|max:5120']);

        $file    = $request->file('file');
        $handle  = fopen($file->getRealPath(), 'r');
        $headers = array_map('trim', fgetcsv($handle));

        $businessId = auth()->user()->business_id;
        $results    = ['imported' => 0, 'skipped' => [], 'errors' => []];
        $rowNum     = 1;

        // Pre-load lookups
        $units      = Unit::pluck('id', 'name')->mapWithKeys(fn($id, $n) => [strtolower($n) => $id]);
        $categories = Category::where('business_id', $businessId)->pluck('id', 'name')
            ->mapWithKeys(fn($id, $n) => [strtolower($n) => $id]);

        while (($row = fgetcsv($handle)) !== false) {
            $rowNum++;
            if (count($row) < 2) continue;

            $data = array_combine($headers, array_pad($row, count($headers), ''));

            $name = trim($data['name'] ?? '');
            if (!$name) { $results['errors'][] = "Row $rowNum: name is required"; continue; }

            $sku = trim($data['sku'] ?? '') ?: null;

            // SKU duplicate check
            if ($sku && Product::where('business_id', $businessId)->where('sku', $sku)->exists()) {
                $results['skipped'][] = "Row $rowNum: SKU \"$sku\" already exists — skipped";
                continue;
            }

            $sellingPrice  = (float) ($data['selling_price'] ?? 0);
            $purchasePrice = (float) ($data['purchase_price'] ?? 0);
            if ($sellingPrice <= 0) { $results['errors'][] = "Row $rowNum: selling_price required"; continue; }

            // Resolve unit
            $unitName = strtolower(trim($data['unit'] ?? ''));
            $unitId   = $units->get($unitName);
            if (!$unitId) {
                // Use first available unit as fallback
                $unitId = Unit::first()?->id;
                if (!$unitId) { $results['errors'][] = "Row $rowNum: unit not found and no default exists"; continue; }
            }

            // Resolve/create category
            $catName = trim($data['category'] ?? '');
            $catId   = null;
            if ($catName) {
                $catId = $categories->get(strtolower($catName));
                if (!$catId) {
                    $cat   = Category::create(['name' => $catName, 'business_id' => $businessId]);
                    $catId = $cat->id;
                    $categories->put(strtolower($catName), $catId);
                }
            }

            // Handle image URL
            $imageUrl = null;
            $rawImg   = trim($data['image_url'] ?? '');
            if ($rawImg && filter_var($rawImg, FILTER_VALIDATE_URL)) {
                $imageUrl = $this->downloadAndProcessImage($rawImg);
            }

            $product = Product::create([
                'business_id'         => $businessId,
                'name'                => $name,
                'sku'                 => $sku,
                'barcode'             => trim($data['barcode'] ?? '') ?: null,
                'category_id'         => $catId,
                'sale_price'          => $sellingPrice,
                'purchase_price'      => $purchasePrice,
                'gst_percentage'      => (float) ($data['gst_rate'] ?? 0),
                'primary_unit_id'     => $unitId,
                'low_stock_threshold' => max(0, (float) ($data['low_stock_threshold'] ?? 0)),
                'description'         => trim($data['description'] ?? '') ?: null,
                'image_url'           => $imageUrl,
                'is_active'           => true,
            ]);

            $qty = max(0, (float) ($data['stock_quantity'] ?? 0));
            $stock = Stock::create([
                'product_id'    => $product->id,
                'business_id'   => $businessId,
                'opening_stock' => $qty,
                'current_stock' => $qty,
            ]);
            if ($qty > 0) {
                StockMovement::create([
                    'stock_id'       => $stock->id,
                    'product_id'     => $product->id,
                    'business_id'    => $businessId,
                    'movement_type'  => 'stock_in',
                    'quantity'       => $qty,
                    'reference_type' => 'import',
                    'reference_id'   => $product->id,
                ]);
            }

            $results['imported']++;
        }
        fclose($handle);

        return $this->success($results, "Import complete: {$results['imported']} products imported");
    }

    private function downloadAndProcessImage(string $url): ?string
    {
        try {
            $response = Http::timeout(15)->get($url);
            if (!$response->successful()) return null;
            $img = imagecreatefromstring($response->body());
            if (!$img) return null;

            $dst   = imagecreatetruecolor(500, 500);
            $white = imagecolorallocate($dst, 255, 255, 255);
            imagefill($dst, 0, 0, $white);
            $sw    = imagesx($img);
            $sh    = imagesy($img);
            $ratio = min(500 / $sw, 500 / $sh);
            $nw    = (int) round($sw * $ratio);
            $nh    = (int) round($sh * $ratio);
            imagecopyresampled($dst, $img, (int) round((500 - $nw) / 2), (int) round((500 - $nh) / 2), 0, 0, $nw, $nh, $sw, $sh);

            $filename = 'products/' . Str::uuid() . '.jpg';
            ob_start(); imagejpeg($dst, null, 85); $jpeg = ob_get_clean();
            imagedestroy($img); imagedestroy($dst);
            Storage::disk('public')->put($filename, $jpeg);
            return '/storage/' . $filename;
        } catch (\Throwable) {
            return null;
        }
    }
}

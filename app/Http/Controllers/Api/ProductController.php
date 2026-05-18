<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;
use App\Models\Stock;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::where('business_id', auth()->user()->business_id)
            ->with('category', 'brand', 'supplier', 'primaryUnit', 'stock');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn($q) => $q->where('name', 'like', "%$s%")
                ->orWhere('sku', 'like', "%$s%")
                ->orWhere('barcode', 'like', "%$s%"));
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }

        if ($request->filled('stock_status')) {
            $query->whereHas('stock', function ($q) use ($request) {
                match ($request->stock_status) {
                    'out_of_stock' => $q->where('current_stock', '<=', 0),
                    'low_stock'    => $q->whereRaw('current_stock > 0 AND current_stock <= (SELECT low_stock_threshold FROM products WHERE products.id = stocks.product_id)'),
                    'in_stock'     => $q->whereRaw('current_stock > (SELECT low_stock_threshold FROM products WHERE products.id = stocks.product_id)'),
                    default        => null,
                };
            });
        }

        $perPage = min((int) ($request->per_page ?? 20), 100);
        $products = $query->paginate($perPage);
        return $this->paginated($products, 'Products retrieved');
    }

    private function normalizeProductData(array $data): array
    {
        if (isset($data['selling_price']) && !isset($data['sale_price'])) {
            $data['sale_price'] = $data['selling_price'];
        }
        if (isset($data['unit_id']) && !isset($data['primary_unit_id'])) {
            $data['primary_unit_id'] = $data['unit_id'];
        }
        if (isset($data['gst_rate']) && !isset($data['gst_percentage'])) {
            $data['gst_percentage'] = $data['gst_rate'];
        }
        unset($data['selling_price'], $data['unit_id'], $data['gst_rate'], $data['stock_quantity']);
        return $data;
    }

    public function store(Request $request)
    {
        $data = $this->normalizeProductData($request->all());
        $request->merge($data);

        $validated = $request->validate([
            'name'                => 'required|string',
            'product_code'        => 'nullable|string',
            'sku'                 => 'nullable|string',
            'barcode'             => 'nullable|string|unique:products',
            'category_id'         => 'nullable|exists:categories,id',
            'brand_id'            => 'nullable|exists:brands,id',
            'supplier_id'         => 'nullable|exists:suppliers,id',
            'hsn_code'            => 'nullable|string',
            'gst_percentage'      => 'nullable|numeric',
            'tax_type'            => 'nullable|in:inclusive,exclusive',
            'description'         => 'nullable|string',
            'purchase_price'      => 'required|numeric',
            'sale_price'          => 'required|numeric',
            'wholesale_price'     => 'nullable|numeric',
            'mrp'                 => 'nullable|numeric',
            'primary_unit_id'     => 'required|exists:units,id',
            'secondary_unit_id'   => 'nullable|exists:units,id',
            'low_stock_threshold' => 'nullable|numeric|min:0',
            'is_active'           => 'nullable|boolean',
        ]);

        // Handle image upload or URL
        if ($request->hasFile('image')) {
            $validated['image_url'] = $this->processUploadedImage($request->file('image'));
        } elseif ($request->filled('image_url') && filter_var($request->image_url, FILTER_VALIDATE_URL)) {
            $validated['image_url'] = $this->downloadAndProcessImage($request->image_url);
        }

        $businessId = auth()->user()->business_id;
        $product = Product::create([...$validated, 'business_id' => $businessId]);

        $openingQty = max(0, (float) ($request->stock_quantity ?? 0));
        $stock = Stock::create([
            'product_id'    => $product->id,
            'business_id'   => $businessId,
            'opening_stock' => $openingQty,
            'current_stock' => $openingQty,
        ]);

        if ($openingQty > 0) {
            StockMovement::create([
                'stock_id'       => $stock->id,
                'product_id'     => $product->id,
                'business_id'    => $businessId,
                'movement_type'  => 'stock_in',
                'quantity'       => $openingQty,
                'reference_type' => 'product',
                'reference_id'   => $product->id,
            ]);
        }

        $product->load('category', 'brand', 'supplier', 'primaryUnit', 'stock');
        return $this->success($product, 'Product created', 201);
    }

    public function show(Product $product)
    {
        $product->load('category', 'brand', 'supplier', 'primaryUnit', 'variants', 'images', 'stock');
        return $this->success($product, 'Product retrieved');
    }

    public function update(Request $request, Product $product)
    {
        $data = $this->normalizeProductData($request->all());
        $request->merge($data);

        $validated = $request->validate([
            'name'                => 'sometimes|string',
            'product_code'        => 'nullable|string',
            'sku'                 => 'nullable|string',
            'category_id'         => 'nullable|exists:categories,id',
            'brand_id'            => 'nullable|exists:brands,id',
            'supplier_id'         => 'nullable|exists:suppliers,id',
            'gst_percentage'      => 'nullable|numeric',
            'tax_type'            => 'nullable|in:inclusive,exclusive',
            'description'         => 'nullable|string',
            'purchase_price'      => 'nullable|numeric',
            'sale_price'          => 'nullable|numeric',
            'wholesale_price'     => 'nullable|numeric',
            'mrp'                 => 'nullable|numeric',
            'primary_unit_id'     => 'nullable|exists:units,id',
            'low_stock_threshold' => 'nullable|numeric|min:0',
            'is_active'           => 'nullable|boolean',
        ]);

        if ($request->hasFile('image')) {
            $validated['image_url'] = $this->processUploadedImage($request->file('image'));
        }

        $product->update($validated);
        $product->load('category', 'brand', 'supplier', 'primaryUnit', 'stock');
        return $this->success($product, 'Product updated');
    }

    public function destroy(Product $product)
    {
        $product->delete();
        return $this->success(null, 'Product deleted');
    }

    public function search(Request $request)
    {
        $query = $request->query('q');
        $products = Product::where('business_id', auth()->user()->business_id)
            ->where(function ($q) use ($query) {
                $q->where('name', 'like', "%$query%")
                  ->orWhere('barcode', 'like', "%$query%")
                  ->orWhere('sku', 'like', "%$query%");
            })
            ->with('category', 'stock')
            ->limit(20)
            ->get();

        return $this->success($products, 'Search results');
    }

    public function generateBarcode(Request $request)
    {
        $validated = $request->validate(['product_id' => 'required|exists:products,id']);
        $product = Product::find($validated['product_id']);
        if (!$product->barcode) {
            $barcode = 'EZY' . str_pad($product->id, 10, '0', STR_PAD_LEFT);
            $product->update(['barcode' => $barcode]);
        }
        return $this->success(['barcode' => $product->barcode], 'Barcode generated');
    }

    public function uploadImage(Request $request, Product $product)
    {
        $request->validate(['image' => 'required|image|max:5120']);
        $url = $this->processUploadedImage($request->file('image'));
        $product->update(['image_url' => $url]);

        $product->images()->create([
            'image_url'  => $url,
            'is_primary' => !$product->images()->exists(),
        ]);

        return $this->success(['image_url' => $url], 'Image uploaded');
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    private function processUploadedImage($file): string
    {
        // Read, resize to 500×500 (fit), save as JPEG
        $img = imagecreatefromstring(file_get_contents($file->getRealPath()));
        if (!$img) {
            $path = $file->store('products', 'public');
            return '/storage/' . $path;
        }

        $src_w = imagesx($img);
        $src_h = imagesy($img);
        $dst = imagecreatetruecolor(500, 500);

        // White background
        $white = imagecolorallocate($dst, 255, 255, 255);
        imagefill($dst, 0, 0, $white);

        // Fit (maintain aspect ratio, centre)
        $ratio = min(500 / $src_w, 500 / $src_h);
        $new_w = (int) round($src_w * $ratio);
        $new_h = (int) round($src_h * $ratio);
        $x_off = (int) round((500 - $new_w) / 2);
        $y_off = (int) round((500 - $new_h) / 2);

        imagecopyresampled($dst, $img, $x_off, $y_off, 0, 0, $new_w, $new_h, $src_w, $src_h);

        $filename = 'products/' . Str::uuid() . '.jpg';
        ob_start();
        imagejpeg($dst, null, 85);
        $jpeg = ob_get_clean();
        imagedestroy($img);
        imagedestroy($dst);

        Storage::disk('public')->put($filename, $jpeg);
        return '/storage/' . $filename;
    }

    private function downloadAndProcessImage(string $url): ?string
    {
        try {
            $response = Http::timeout(15)->get($url);
            if (!$response->successful()) return null;

            $img = imagecreatefromstring($response->body());
            if (!$img) return null;

            $src_w = imagesx($img);
            $src_h = imagesy($img);
            $dst = imagecreatetruecolor(500, 500);
            $white = imagecolorallocate($dst, 255, 255, 255);
            imagefill($dst, 0, 0, $white);

            $ratio = min(500 / $src_w, 500 / $src_h);
            $new_w = (int) round($src_w * $ratio);
            $new_h = (int) round($src_h * $ratio);
            $x_off = (int) round((500 - $new_w) / 2);
            $y_off = (int) round((500 - $new_h) / 2);

            imagecopyresampled($dst, $img, $x_off, $y_off, 0, 0, $new_w, $new_h, $src_w, $src_h);

            $filename = 'products/' . Str::uuid() . '.jpg';
            ob_start();
            imagejpeg($dst, null, 85);
            $jpeg = ob_get_clean();
            imagedestroy($img);
            imagedestroy($dst);

            Storage::disk('public')->put($filename, $jpeg);
            return '/storage/' . $filename;
        } catch (\Throwable) {
            return null;
        }
    }
}

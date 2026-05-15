<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;
use App\Models\Stock;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::where('business_id', auth()->user()->business_id)
            ->with('category', 'brand', 'primaryUnit', 'stock');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn($q) => $q->where('name', 'like', "%$s%")
                ->orWhere('sku', 'like', "%$s%")
                ->orWhere('barcode', 'like', "%$s%"));
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
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
            'name' => 'required|string',
            'product_code' => 'nullable|string',
            'sku' => 'nullable|string',
            'barcode' => 'nullable|string|unique:products',
            'category_id' => 'nullable|exists:categories,id',
            'brand_id' => 'nullable|exists:brands,id',
            'hsn_code' => 'nullable|string',
            'gst_percentage' => 'nullable|numeric',
            'description' => 'nullable|string',
            'purchase_price' => 'required|numeric',
            'sale_price' => 'required|numeric',
            'wholesale_price' => 'nullable|numeric',
            'mrp' => 'nullable|numeric',
            'primary_unit_id' => 'required|exists:units,id',
            'secondary_unit_id' => 'nullable|exists:units,id',
            'is_active' => 'nullable|boolean',
        ]);

        $businessId = auth()->user()->business_id;
        $product = Product::create([...$validated, 'business_id' => $businessId]);

        // Create stock record with opening stock
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

        $product->load('category', 'brand', 'primaryUnit', 'stock');
        return $this->success($product, 'Product created', 201);
    }

    public function show(Product $product)
    {
        $product->load('category', 'brand', 'primaryUnit', 'variants', 'images', 'stock');
        return $this->success($product, 'Product retrieved');
    }

    public function update(Request $request, Product $product)
    {
        $data = $this->normalizeProductData($request->all());
        $request->merge($data);

        $validated = $request->validate([
            'name' => 'sometimes|string',
            'product_code' => 'nullable|string',
            'sku' => 'nullable|string',
            'category_id' => 'nullable|exists:categories,id',
            'brand_id' => 'nullable|exists:brands,id',
            'gst_percentage' => 'nullable|numeric',
            'description' => 'nullable|string',
            'purchase_price' => 'nullable|numeric',
            'sale_price' => 'nullable|numeric',
            'wholesale_price' => 'nullable|numeric',
            'mrp' => 'nullable|numeric',
            'primary_unit_id' => 'nullable|exists:units,id',
            'is_active' => 'nullable|boolean',
        ]);

        $product->update($validated);
        $product->load('category', 'brand', 'primaryUnit', 'stock');
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
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
        ]);

        $product = Product::find($validated['product_id']);
        if (!$product->barcode) {
            $barcode = 'EZY' . str_pad($product->id, 10, '0', STR_PAD_LEFT);
            $product->update(['barcode' => $barcode]);
        }

        return $this->success(['barcode' => $product->barcode], 'Barcode generated');
    }

    public function uploadImage(Request $request, Product $product)
    {
        $validated = $request->validate([
            'image' => 'required|image|max:2048',
        ]);

        $path = $request->file('image')->store('products', 'public');
        
        $product->images()->create([
            'image_url' => '/storage/' . $path,
            'is_primary' => !$product->images()->exists(),
        ]);

        return $this->success(['image_url' => '/storage/' . $path], 'Image uploaded');
    }
}

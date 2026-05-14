<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $products = Product::where('business_id', auth()->user()->business_id)
            ->with('category', 'brand', 'primaryUnit')
            ->paginate(20);
        return $this->paginated($products, 'Products retrieved');
    }

    public function store(Request $request)
    {
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
        ]);

        $product = Product::create([
            ...$validated,
            'business_id' => auth()->user()->business_id,
        ]);

        return $this->success($product, 'Product created', 201);
    }

    public function show(Product $product)
    {
        $product->load('category', 'brand', 'primaryUnit', 'variants', 'images', 'stock');
        return $this->success($product, 'Product retrieved');
    }

    public function update(Request $request, Product $product)
    {
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
        ]);

        $product->update($validated);
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

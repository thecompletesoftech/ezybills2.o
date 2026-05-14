<?php

namespace App\Http\Controllers\Api;

use App\Models\Brand;
use Illuminate\Http\Request;

class BrandController extends Controller
{
    public function index()
    {
        $brands = Brand::where('business_id', auth()->user()->business_id)->paginate(20);
        return $this->paginated($brands, 'Brands retrieved');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'description' => 'nullable|string',
        ]);

        $brand = Brand::create([
            ...$validated,
            'business_id' => auth()->user()->business_id,
        ]);

        return $this->success($brand, 'Brand created', 201);
    }

    public function show(Brand $brand)
    {
        return $this->success($brand, 'Brand retrieved');
    }

    public function update(Request $request, Brand $brand)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string',
            'description' => 'nullable|string',
        ]);

        $brand->update($validated);
        return $this->success($brand, 'Brand updated');
    }

    public function destroy(Brand $brand)
    {
        $brand->delete();
        return $this->success(null, 'Brand deleted');
    }
}

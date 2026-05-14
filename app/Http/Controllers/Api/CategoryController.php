<?php

namespace App\Http\Controllers\Api;

use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = Category::where('business_id', auth()->user()->business_id)
            ->paginate(20);
        return $this->paginated($categories, 'Categories retrieved');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'description' => 'nullable|string',
        ]);

        $category = Category::create([
            ...$validated,
            'business_id' => auth()->user()->business_id,
        ]);

        return $this->success($category, 'Category created', 201);
    }

    public function show(Category $category)
    {
        return $this->success($category, 'Category retrieved');
    }

    public function update(Request $request, Category $category)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string',
            'description' => 'nullable|string',
        ]);

        $category->update($validated);
        return $this->success($category, 'Category updated');
    }

    public function destroy(Category $category)
    {
        $category->delete();
        return $this->success(null, 'Category deleted');
    }
}

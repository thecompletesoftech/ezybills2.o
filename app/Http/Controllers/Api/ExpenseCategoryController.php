<?php

namespace App\Http\Controllers\Api;

use App\Models\ExpenseCategory;
use Illuminate\Http\Request;

class ExpenseCategoryController extends Controller
{
    public function index()
    {
        $categories = ExpenseCategory::where('business_id', auth()->user()->business_id)->paginate(20);
        return $this->paginated($categories, 'Expense categories retrieved');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'description' => 'nullable|string',
        ]);

        $category = ExpenseCategory::create([
            ...$validated,
            'business_id' => auth()->user()->business_id,
        ]);

        return $this->success($category, 'Category created', 201);
    }

    public function update(Request $request, ExpenseCategory $expenseCategory)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string',
            'description' => 'nullable|string',
        ]);

        $expenseCategory->update($validated);
        return $this->success($expenseCategory, 'Category updated');
    }

    public function destroy(ExpenseCategory $expenseCategory)
    {
        $expenseCategory->delete();
        return $this->success(null, 'Category deleted');
    }
}

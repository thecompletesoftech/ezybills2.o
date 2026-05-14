<?php

namespace App\Http\Controllers\Api;

use App\Models\Expense;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index()
    {
        $expenses = Expense::where('business_id', auth()->user()->business_id)
            ->with('category')
            ->paginate(20);
        return $this->paginated($expenses, 'Expenses retrieved');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:expense_categories,id',
            'description' => 'required|string',
            'amount' => 'required|numeric',
            'payment_method' => 'required|in:cash,upi,card,bank_transfer',
        ]);

        $expense = Expense::create([
            ...$validated,
            'business_id' => auth()->user()->business_id,
            'created_by' => auth()->id(),
            'expense_date' => now(),
        ]);

        return $this->success($expense, 'Expense created', 201);
    }

    public function show(Expense $expense)
    {
        $expense->load('category');
        return $this->success($expense, 'Expense retrieved');
    }

    public function destroy(Expense $expense)
    {
        $expense->delete();
        return $this->success(null, 'Expense deleted');
    }
}

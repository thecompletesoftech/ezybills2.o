<?php

namespace App\Http\Controllers\Api;

use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Purchase;
use Illuminate\Http\Request;

class ProfitLossReportController extends Controller
{
    public function calculate(Request $request)
    {
        $businessId = $request->user()->business_id;

        $request->validate([
            'from' => 'nullable|date',
            'to'   => 'nullable|date',
        ]);

        $from = $request->from ?? now()->startOfMonth()->toDateString();
        $to   = $request->to   ?? now()->toDateString();

        // Revenue — paid & partial invoices in range
        $revenue = Invoice::where('business_id', $businessId)
            ->whereDate('invoice_date', '>=', $from)
            ->whereDate('invoice_date', '<=', $to)
            ->where('invoice_status', '!=', 'cancelled')
            ->sum('total_amount');

        $totalDiscount = Invoice::where('business_id', $businessId)
            ->whereDate('invoice_date', '>=', $from)
            ->whereDate('invoice_date', '<=', $to)
            ->where('invoice_status', '!=', 'cancelled')
            ->sum('discount_amount');

        // Cost of goods — purchases in range
        $cogs = Purchase::where('business_id', $businessId)
            ->whereDate('purchase_date', '>=', $from)
            ->whereDate('purchase_date', '<=', $to)
            ->sum('total_amount');

        // Expenses in range
        $expenses = Expense::where('business_id', $businessId)
            ->whereDate('expense_date', '>=', $from)
            ->whereDate('expense_date', '<=', $to)
            ->sum('amount');

        $grossProfit = (float) $revenue - (float) $cogs;
        $netProfit   = $grossProfit - (float) $expenses;

        return $this->success([
            'from'           => $from,
            'to'             => $to,
            'revenue'        => (float) $revenue,
            'total_discount' => (float) $totalDiscount,
            'cogs'           => (float) $cogs,
            'gross_profit'   => $grossProfit,
            'expenses'       => (float) $expenses,
            'net_profit'     => $netProfit,
        ], 'Profit and loss report');
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Models\Invoice;
use App\Models\Customer;
use App\Models\Stock;
use App\Models\Expense;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function summary()
    {
        $user = auth()->user();
        $businessId = $user->business_id;

        $today = Carbon::today();

        $totalSales = Invoice::where('business_id', $businessId)
            ->whereDate('created_at', $today)
            ->where('invoice_status', '!=', 'cancelled')
            ->sum('total_amount');

        $totalInvoices = Invoice::where('business_id', $businessId)
            ->whereDate('created_at', $today)
            ->count();

        $totalCustomers = Customer::where('business_id', $businessId)->count();

        $pendingDues = Customer::where('business_id', $businessId)
            ->where('due_amount', '>', 0)
            ->sum('due_amount');

        $lowStockCount = Stock::where('business_id', $businessId)
            ->where('current_stock', '<=', 5)
            ->count();

        return $this->success([
            'total_sales'     => (float) $totalSales,
            'total_invoices'  => (int) $totalInvoices,
            'total_customers' => (int) $totalCustomers,
            'pending_dues'    => (float) $pendingDues,
            'low_stock_count' => (int) $lowStockCount,
        ], 'Dashboard summary');
    }

    public function charts()
    {
        $user = auth()->user();
        $businessId = $user->business_id;

        $weeklySales = Invoice::where('business_id', $businessId)
            ->where('invoice_status', '!=', 'cancelled')
            ->where('created_at', '>=', Carbon::now()->subDays(6)->startOfDay())
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(total_amount) as amount')
            )
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn($row) => [
                'date'   => $row->date,
                'amount' => (float) $row->amount,
            ]);

        return $this->success([
            'weekly_sales' => $weeklySales,
        ], 'Dashboard charts data');
    }
}

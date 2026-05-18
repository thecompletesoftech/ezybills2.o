<?php

namespace App\Http\Controllers\Api;

use App\Models\Invoice;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Stock;
use App\Models\Expense;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $businessId = $user->business_id;
        $today = Carbon::today();
        $startOfMonth = Carbon::now()->startOfMonth();
        $startOfLastMonth = Carbon::now()->subMonth()->startOfMonth();
        $endOfLastMonth = Carbon::now()->subMonth()->endOfMonth();

        $todaySales = Invoice::where('business_id', $businessId)
            ->whereDate('created_at', $today)
            ->where('invoice_status', '!=', 'cancelled')
            ->sum('total_amount');

        $todayInvoices = Invoice::where('business_id', $businessId)
            ->whereDate('created_at', $today)
            ->where('invoice_status', '!=', 'cancelled')
            ->count();

        $todayCollections = Invoice::where('business_id', $businessId)
            ->whereDate('created_at', $today)
            ->where('payment_status', 'paid')
            ->where('invoice_status', '!=', 'cancelled')
            ->sum('total_amount');

        $totalCustomers = Customer::where('business_id', $businessId)->count();

        $totalProducts = Product::where('business_id', $businessId)->count();

        $lowStockCount = Stock::where('stock.business_id', $businessId)
            ->join('products', 'stock.product_id', '=', 'products.id')
            ->whereColumn('stock.current_stock', '<=', 'products.low_stock_threshold')
            ->where('products.low_stock_threshold', '>', 0)
            ->count();

        $pendingDues = Customer::where('business_id', $businessId)
            ->where('due_amount', '>', 0)
            ->sum('due_amount');

        $thisMonthSales = Invoice::where('business_id', $businessId)
            ->where('created_at', '>=', $startOfMonth)
            ->where('invoice_status', '!=', 'cancelled')
            ->sum('total_amount');

        $lastMonthSales = Invoice::where('business_id', $businessId)
            ->whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])
            ->where('invoice_status', '!=', 'cancelled')
            ->sum('total_amount');

        $weeklyData = Invoice::where('business_id', $businessId)
            ->where('invoice_status', '!=', 'cancelled')
            ->where('created_at', '>=', Carbon::now()->subDays(6)->startOfDay())
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(total_amount) as sales'),
                DB::raw('COUNT(*) as invoices')
            )
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn($row) => [
                'label'    => Carbon::parse($row->date)->format('D'),
                'sales'    => (float) $row->sales,
                'invoices' => (int) $row->invoices,
            ]);

        $topProducts = DB::table('invoice_items')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->join('products', 'invoice_items.product_id', '=', 'products.id')
            ->where('invoices.business_id', $businessId)
            ->where('invoices.invoice_status', '!=', 'cancelled')
            ->where('invoices.created_at', '>=', $startOfMonth)
            ->select(
                'invoice_items.product_id',
                'products.name as product_name',
                DB::raw('SUM(invoice_items.quantity) as quantity'),
                DB::raw('SUM(invoice_items.line_total) as total_sales')
            )
            ->groupBy('invoice_items.product_id', 'products.name')
            ->orderByDesc('total_sales')
            ->limit(5)
            ->get()
            ->map(fn($row) => [
                'product_id'   => $row->product_id,
                'product_name' => $row->product_name,
                'quantity'     => (int) $row->quantity,
                'total_sales'  => (float) $row->total_sales,
            ]);

        return $this->success([
            'today_sales'       => (float) $todaySales,
            'today_invoices'    => (int) $todayInvoices,
            'today_collections' => (float) $todayCollections,
            'total_customers'   => (int) $totalCustomers,
            'total_products'    => (int) $totalProducts,
            'low_stock_count'   => (int) $lowStockCount,
            'pending_dues'      => (float) $pendingDues,
            'this_month_sales'  => (float) $thisMonthSales,
            'last_month_sales'  => (float) $lastMonthSales,
            'weekly_data'       => $weeklyData,
            'top_products'      => $topProducts,
        ], 'Dashboard');
    }

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

        $lowStockCount = Stock::where('stock.business_id', $businessId)
            ->join('products', 'stock.product_id', '=', 'products.id')
            ->whereColumn('stock.current_stock', '<=', 'products.low_stock_threshold')
            ->where('products.low_stock_threshold', '>', 0)
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

<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\Invoice;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        $now = now();

        // Total registered businesses
        $totalCustomers = Business::count();

        // Active shops: is_active true AND subscription not expired
        $activeShops = Business::where('is_active', true)
            ->where('subscription_expires_at', '>', $now)
            ->count();

        // Expired shops: subscription expired OR is_active = false
        $expiredShops = Business::where(function ($q) use ($now) {
            $q->where('subscription_expires_at', '<', $now)
              ->orWhere('is_active', false);
        })->count();

        // Trial accounts: no subscription plan assigned
        $trialAccounts = Business::whereNull('subscription_plan_id')->count();

        // Pending renewals: subscriptions with status=active expiring in the next 7 days
        $pendingRenewals = Subscription::where('status', 'active')
            ->whereBetween('end_date', [$now, $now->copy()->addDays(7)])
            ->count();

        // Monthly revenue approximation: sum of plan prices for active subscriptions
        // created this calendar month
        $monthlyRevenue = Subscription::where('status', 'active')
            ->whereYear('created_at', $now->year)
            ->whereMonth('created_at', $now->month)
            ->join('plans', 'subscriptions.plan_id', '=', 'plans.id')
            ->sum('plans.price');

        // New businesses registered this month
        $newBusinessesThisMonth = Business::whereYear('created_at', $now->year)
            ->whereMonth('created_at', $now->month)
            ->count();

        // Total invoices across all businesses
        $totalInvoices = Invoice::count();

        return $this->success([
            'total_customers'          => (int) $totalCustomers,
            'active_shops'             => (int) $activeShops,
            'expired_shops'            => (int) $expiredShops,
            'trial_accounts'           => (int) $trialAccounts,
            'monthly_revenue'          => (float) $monthlyRevenue,
            'total_revenue'            => 0,
            'pending_renewals'         => (int) $pendingRenewals,
            'total_invoices'           => (int) $totalInvoices,
            'new_businesses_this_month'=> (int) $newBusinessesThisMonth,
        ], 'Admin dashboard stats');
    }
}

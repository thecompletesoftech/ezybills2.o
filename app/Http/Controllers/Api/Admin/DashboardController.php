<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;

class DashboardController extends Controller
{
    public function index()
    {
        return response()->json([
            'total_customers' => 0,
            'active_shops' => 0,
            'expired_shops' => 0,
            'trial_accounts' => 0,
            'monthly_revenue' => 0,
            'total_revenue' => 0,
            'active_devices' => 0,
            'whatsapp_usage' => 0,
            'total_bills' => 0,
            'pending_renewals' => 0,
            'support_tickets' => 0,
        ]);
    }
}

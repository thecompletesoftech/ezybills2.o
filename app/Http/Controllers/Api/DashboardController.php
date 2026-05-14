<?php

namespace App\Http\Controllers\Api;

class DashboardController extends Controller
{
    public function summary()
    {
        $user = auth()->user();
        $businessId = $user->business_id;

        return $this->success([
            'today_sales' => 0,
            'today_purchase' => 0,
            'today_expenses' => 0,
            'today_profit' => 0,
            'pending_due' => 0,
            'low_stock_count' => 0,
            'total_orders' => 0,
        ], 'Dashboard summary');
    }

    public function charts()
    {
        return $this->success([], 'Dashboard charts data');
    }
}

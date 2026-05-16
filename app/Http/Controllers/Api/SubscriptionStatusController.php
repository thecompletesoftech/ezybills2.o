<?php

namespace App\Http\Controllers\Api;

use App\Models\Business;
use App\Models\Subscription;

class SubscriptionStatusController extends Controller
{
    public function myPlan()
    {
        $user = auth()->user();

        $business = Business::with('subscriptionPlan')
            ->find($user->business_id);

        if (!$business) {
            return $this->error('Business not found', 404);
        }

        $latestSub = Subscription::where('business_id', $business->id)
            ->with('plan')
            ->latest()
            ->first();

        $daysLeft = $business->subscription_expires_at
            ? (int) max(0, now()->diffInDays($business->subscription_expires_at, false))
            : 0;

        $isActive = $business->is_active
            && $business->subscription_expires_at
            && $business->subscription_expires_at > now();

        return $this->success([
            'plan'         => $business->subscriptionPlan,
            'subscription' => $latestSub,
            'expires_at'   => $business->subscription_expires_at,
            'days_left'    => $daysLeft,
            'is_active'    => $isActive,
            'is_trial'     => $business->subscription_plan_id === null,
        ], 'Subscription status');
    }
}

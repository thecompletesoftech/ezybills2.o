<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\Plan;
use App\Models\Subscription;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    public function index(Request $request)
    {
        $query = Subscription::with(['business:id,name', 'plan:id,name,billing_cycle'])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('business_id')) {
            $query->where('business_id', $request->input('business_id'));
        }

        $items = $query->paginate(20);

        // Flatten business/plan names for the frontend
        $items->getCollection()->transform(function ($sub) {
            $sub->business_name = $sub->business?->name;
            $sub->plan_name     = $sub->plan?->name;
            $sub->plan_price    = (float) ($sub->plan?->price ?? 0);
            $sub->billing_cycle = $sub->plan?->billing_cycle;
            return $sub;
        });

        return $this->paginated($items, 'Subscriptions retrieved');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'business_id'      => 'required|exists:businesses,id',
            'plan_id'          => 'required|exists:plans,id',
            'start_date'       => 'required|date',
            'end_date'         => 'required|date|after:start_date',
            'payment_mode'     => 'nullable|string|max:50',
            'reference_number' => 'nullable|string|max:100',
            'status'           => 'nullable|in:active,expired,cancelled',
        ]);

        $validated['status']       = $validated['status'] ?? 'active';
        $validated['renewal_date'] = $validated['end_date'];

        // Cancel any existing active subscriptions for this business
        Subscription::where('business_id', $validated['business_id'])
            ->where('status', 'active')
            ->update(['status' => 'cancelled']);

        $subscription = Subscription::create($validated);

        // Update the business plan and expiry
        Business::where('id', $validated['business_id'])->update([
            'subscription_plan_id'    => $validated['plan_id'],
            'subscription_expires_at' => $validated['end_date'],
        ]);

        $subscription->load(['business:id,name', 'plan:id,name,billing_cycle']);

        return $this->success($subscription, 'Subscription created', 201);
    }

    public function show(Subscription $subscription)
    {
        $subscription->load(['business', 'plan']);

        return $this->success($subscription, 'Subscription details');
    }

    public function extend(Request $request, Subscription $subscription)
    {
        $validated = $request->validate([
            'days' => 'required|integer|min:1',
        ]);

        $days = (int) $validated['days'];

        // Extend from existing end_date (or from now if already expired)
        $base     = $subscription->end_date && $subscription->end_date->isFuture()
            ? $subscription->end_date
            : now();
        $newEndDate = $base->addDays($days);

        $subscription->update([
            'end_date'     => $newEndDate,
            'renewal_date' => $newEndDate,
            'status'       => 'active',
        ]);

        // Sync the business expiry
        Business::where('id', $subscription->business_id)->update([
            'subscription_expires_at' => $newEndDate,
        ]);

        $subscription->load(['business:id,name', 'plan:id,name']);

        return $this->success($subscription, "Subscription extended by {$days} day(s)");
    }

    public function destroy(Subscription $subscription)
    {
        $subscription->update(['status' => 'cancelled']);

        return $this->success(null, 'Subscription cancelled');
    }
}

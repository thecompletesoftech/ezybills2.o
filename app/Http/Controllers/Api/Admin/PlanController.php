<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\Request;

class PlanController extends Controller
{
    public function index()
    {
        $plans = Plan::withCount('subscriptions')->orderBy('price')->get();

        return $this->success($plans, 'Plans retrieved');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                    => 'required|string|max:100',
            'type'                    => 'required|string|in:trial,standard,premium,enterprise',
            'price'                   => 'required|numeric|min:0',
            'currency'                => 'nullable|string|max:10',
            'billing_cycle'           => 'required|in:monthly,quarterly,yearly',
            'device_limit'            => 'nullable|integer|min:1',
            'user_limit'              => 'nullable|integer|min:1',
            'whatsapp_message_limit'  => 'nullable|integer|min:0',
            'branch_limit'            => 'nullable|integer|min:1',
            'storage_limit'           => 'nullable|integer|min:0',
            'features'                => 'nullable|array',
            'features.*'              => 'string',
            'is_active'               => 'nullable|boolean',
        ]);

        $validated['currency']  = $validated['currency'] ?? 'INR';
        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['features']  = $validated['features'] ?? [];

        $plan = Plan::create($validated);

        return $this->success($plan, 'Plan created', 201);
    }

    public function show(Plan $plan)
    {
        $plan->loadCount('subscriptions');

        return $this->success($plan, 'Plan details');
    }

    public function update(Request $request, Plan $plan)
    {
        $validated = $request->validate([
            'name'                    => 'sometimes|required|string|max:100',
            'type'                    => 'sometimes|required|string|in:trial,standard,premium,enterprise',
            'price'                   => 'sometimes|required|numeric|min:0',
            'currency'                => 'nullable|string|max:10',
            'billing_cycle'           => 'sometimes|required|in:monthly,quarterly,yearly',
            'device_limit'            => 'nullable|integer|min:1',
            'user_limit'              => 'nullable|integer|min:1',
            'whatsapp_message_limit'  => 'nullable|integer|min:0',
            'branch_limit'            => 'nullable|integer|min:1',
            'storage_limit'           => 'nullable|integer|min:0',
            'features'                => 'nullable|array',
            'features.*'              => 'string',
            'is_active'               => 'nullable|boolean',
        ]);

        $plan->update($validated);

        return $this->success($plan->fresh(), 'Plan updated');
    }

    public function destroy(Plan $plan)
    {
        $activeCount = $plan->subscriptions()
            ->where('status', 'active')
            ->where('end_date', '>', now())
            ->count();

        if ($activeCount > 0) {
            return $this->error(
                "Cannot delete plan: {$activeCount} active subscription(s) are using it.",
                422
            );
        }

        $plan->delete();

        return $this->success(null, 'Plan deleted');
    }
}

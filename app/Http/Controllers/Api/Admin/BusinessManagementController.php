<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Http\Request;

class BusinessManagementController extends Controller
{
    public function index(Request $request)
    {
        $query = Business::with('owner:id,name,email,phone')
            ->withCount(['invoices', 'users'])
            ->leftJoin('plans', 'businesses.subscription_plan_id', '=', 'plans.id')
            ->select(
                'businesses.*',
                'plans.name as plan_name'
            )
            ->orderByDesc('businesses.created_at');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('businesses.name', 'like', "%{$search}%")
                  ->orWhere('businesses.email', 'like', "%{$search}%")
                  ->orWhere('businesses.mobile_number', 'like', "%{$search}%");
            });
        }

        if ($request->filled('is_active')) {
            $query->where('businesses.is_active', (bool) $request->input('is_active'));
        }

        $items = $query->paginate(20);

        $items->getCollection()->transform(function ($b) {
            $b->owner_name  = $b->owner?->name;
            $b->owner_email = $b->owner?->email;
            $b->subscription_plan_name = $b->plan_name; // from join alias
            return $b;
        });

        return $this->paginated($items, 'Businesses retrieved');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:150',
            'owner_id'      => 'required|exists:users,id',
            'business_type' => 'nullable|string|max:50',
            'gst_number'    => 'nullable|string|max:20',
            'address'       => 'nullable|string',
            'mobile_number' => 'nullable|string|max:20',
            'email'         => 'nullable|email|max:150',
        ]);

        $validated['is_active'] = true;

        $business = Business::create($validated);
        $business->load('owner:id,name,email');

        return $this->success($business, 'Business created', 201);
    }

    public function show(Business $business)
    {
        $business->load([
            'owner:id,name,email,phone',
            'subscriptionPlan:id,name,price,billing_cycle',
        ]);
        $business->loadCount(['users', 'invoices']);

        $latestSubscription = Subscription::where('business_id', $business->id)
            ->with('plan:id,name,price')
            ->latest()
            ->first();

        $result = $business->toArray();
        $result['owner_name']              = $business->owner?->name;
        $result['owner_email']             = $business->owner?->email;
        $result['subscription_plan_name']  = $business->subscriptionPlan?->name;
        $result['invoice_count']           = $business->invoices_count;
        $result['user_count']              = $business->users_count;
        $result['latest_subscription']     = $latestSubscription;

        return $this->success($result, 'Business details');
    }

    public function update(Request $request, Business $business)
    {
        $validated = $request->validate([
            'name'          => 'sometimes|required|string|max:150',
            'business_type' => 'nullable|string|max:50',
            'gst_number'    => 'nullable|string|max:20',
            'address'       => 'nullable|string',
            'mobile_number' => 'nullable|string|max:20',
            'email'         => 'nullable|email|max:150',
            'is_active'     => 'nullable|boolean',
        ]);

        $business->update($validated);

        return $this->success($business->fresh(), 'Business updated');
    }

    public function destroy(Business $business)
    {
        // Soft-delete by deactivating rather than hard-delete to preserve invoice history
        $business->update(['is_active' => false]);

        return $this->success(null, 'Business deactivated');
    }

    public function suspend(Business $business)
    {
        $business->update(['is_active' => false]);

        return $this->success(null, 'Business suspended');
    }

    public function activate(Business $business)
    {
        $business->update(['is_active' => true]);

        return $this->success(null, 'Business activated');
    }

    public function loginAsCustomer(Business $business)
    {
        $owner = $business->owner;

        if (!$owner) {
            return $this->error('Business owner not found', 404);
        }

        // Revoke any existing admin-impersonation tokens to keep things clean
        $owner->tokens()->where('name', 'admin-impersonation')->delete();

        $token = $owner->createToken('admin-impersonation')->plainTextToken;

        return $this->success([
            'token'    => $token,
            'user'     => [
                'id'          => $owner->id,
                'name'        => $owner->name,
                'email'       => $owner->email,
                'role'        => $owner->role,
                'business_id' => $owner->business_id,
            ],
            'business' => [
                'id'   => $business->id,
                'name' => $business->name,
            ],
        ], 'Impersonation token created');
    }
}

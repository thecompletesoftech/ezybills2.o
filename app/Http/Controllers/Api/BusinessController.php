<?php

namespace App\Http\Controllers\Api;

use App\Models\Business;
use App\Models\BusinessSettings;
use Illuminate\Http\Request;

class BusinessController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        if ($user->isSuperAdmin()) {
            $businesses = Business::paginate(15);
        } else {
            $businesses = Business::where('owner_id', $user->id)->paginate(15);
        }
        return $this->paginated($businesses, 'Businesses retrieved');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'business_type' => 'required|in:retail,grocery,mobile_shop,electronics,fashion,medical,hardware,cafe,restaurant,food_cart,bakery',
            'gst_number' => 'nullable|string',
            'address' => 'nullable|string',
            'mobile_number' => 'nullable|string',
            'email' => 'nullable|email',
        ]);

        $business = Business::create([
            ...$validated,
            'owner_id' => auth()->id(),
        ]);

        BusinessSettings::create([
            'business_id' => $business->id,
            'enable_restaurant_features' => $business->isRestaurant(),
        ]);

        return $this->success($business, 'Business created', 201);
    }

    public function show(Business $business)
    {
        $this->authorize('view', $business);
        $business->load('settings', 'subscriptionPlan', 'users');
        return $this->success($business, 'Business retrieved');
    }

    public function update(Request $request, Business $business)
    {
        $this->authorize('update', $business);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'gst_number' => 'nullable|string',
            'address' => 'nullable|string',
            'mobile_number' => 'nullable|string',
            'email' => 'nullable|email',
            'logo_url' => 'nullable|string',
            'invoice_footer' => 'nullable|string',
            'bank_account_number' => 'nullable|string',
            'bank_ifsc' => 'nullable|string',
            'upi_id' => 'nullable|string',
        ]);

        $business->update($validated);
        return $this->success($business, 'Business updated');
    }

    public function destroy(Business $business)
    {
        $this->authorize('delete', $business);
        $business->delete();
        return $this->success(null, 'Business deleted');
    }
}

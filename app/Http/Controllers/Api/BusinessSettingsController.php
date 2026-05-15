<?php

namespace App\Http\Controllers\Api;

use App\Models\Business;
use App\Models\BusinessSetting;
use Illuminate\Http\Request;

class BusinessSettingsController extends Controller
{
    public function show(Business $business)
    {
        $settings = BusinessSetting::where('business_id', $business->id)->get()
            ->pluck('value', 'key');
        return $this->success($settings, 'Settings retrieved');
    }

    public function update(Request $request, Business $business)
    {
        $validated = $request->validate([
            'settings' => 'required|array',
        ]);

        foreach ($validated['settings'] as $key => $value) {
            BusinessSetting::updateOrCreate(
                ['business_id' => $business->id, 'key' => $key],
                ['value' => $value]
            );
        }

        return $this->success(null, 'Settings updated');
    }
}

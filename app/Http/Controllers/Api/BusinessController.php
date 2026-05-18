<?php

namespace App\Http\Controllers\Api;

use App\Models\Business;
use App\Models\BusinessSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

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
            'business_type' => 'sometimes|in:retail,grocery,mobile_shop,electronics,fashion,medical,hardware,cafe,restaurant,food_cart,bakery',
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

    public function uploadLogo(Request $request, Business $business)
    {
        $this->authorize('update', $business);

        $request->validate(['logo' => 'required|image|max:5120']);

        $file = $request->file('logo');
        $imageData = file_get_contents($file->getRealPath());
        $src = imagecreatefromstring($imageData);
        if (!$src) {
            return response()->json(['message' => 'Invalid image file'], 422);
        }

        $origW = imagesx($src);
        $origH = imagesy($src);
        $size = 300;
        $ratio = min($size / $origW, $size / $origH);
        $newW = (int) ($origW * $ratio);
        $newH = (int) ($origH * $ratio);

        $dst = imagecreatetruecolor($size, $size);
        $white = imagecolorallocate($dst, 255, 255, 255);
        imagefill($dst, 0, 0, $white);
        $x = (int) (($size - $newW) / 2);
        $y = (int) (($size - $newH) / 2);
        imagecopyresampled($dst, $src, $x, $y, 0, 0, $newW, $newH, $origW, $origH);

        $filename = 'logos/business_' . $business->id . '_' . time() . '.jpg';
        ob_start();
        imagejpeg($dst, null, 85);
        $jpeg = ob_get_clean();
        imagedestroy($src);
        imagedestroy($dst);

        Storage::disk('public')->put($filename, $jpeg);
        $logoUrl = Storage::disk('public')->url($filename);

        $business->update(['logo_url' => $logoUrl]);
        return $this->success(['logo_url' => $logoUrl], 'Logo uploaded');
    }

    public function destroy(Business $business)
    {
        $this->authorize('delete', $business);
        $business->delete();
        return $this->success(null, 'Business deleted');
    }
}

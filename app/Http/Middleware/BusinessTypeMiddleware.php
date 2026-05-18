<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class BusinessTypeMiddleware
{
    public function handle(Request $request, Closure $next, ...$types): mixed
    {
        $user = $request->user();

        if (!$user || !$user->business) {
            return response()->json([
                'success' => false,
                'message' => 'Business not found',
            ], 404);
        }

        $settings = $user->business->settings;

        // Feature is accessible if admin has explicitly enabled it OR
        // the business type is naturally a restaurant type (and settings haven't disabled it)
        $featureEnabled = $settings?->enable_restaurant_features
            ?? $user->business->isRestaurant();

        if (!$featureEnabled) {
            return response()->json([
                'success' => false,
                'message' => 'Restaurant features are not enabled for your business. Contact your admin.',
            ], 403);
        }

        return $next($request);
    }
}

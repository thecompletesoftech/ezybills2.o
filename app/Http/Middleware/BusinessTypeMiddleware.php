<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class BusinessTypeMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, ...$types): mixed
    {
        $user = $request->user();
        
        if (!$user || !$user->business) {
            return response()->json([
                'success' => false,
                'message' => 'Business not found',
            ], 404);
        }

        if (!in_array($user->business->business_type, $types)) {
            return response()->json([
                'success' => false,
                'message' => 'This feature is not available for your business type',
            ], 403);
        }

        return $next($request);
    }
}

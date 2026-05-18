<?php

namespace App\Http\Controllers\Api;

use App\Models\Token;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TokenController extends Controller
{
    public function index(Request $request)
    {
        $businessId = $request->user()->business_id;
        $tokens = Token::where('business_id', $businessId)
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->date, fn($q) => $q->whereDate('token_time', $request->date))
            ->latest('token_time')
            ->get();

        return $this->success($tokens, 'Tokens retrieved');
    }

    public function store(Request $request)
    {
        $businessId = $request->user()->business_id;
        $data = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.name' => 'required|string',
            'items.*.qty' => 'required|numeric|min:0.01',
            'items.*.price' => 'nullable|numeric|min:0',
            'token_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:500',
        ]);

        $todayCount = Token::where('business_id', $businessId)
            ->whereDate('created_at', today())
            ->count();

        $token = Token::create([
            'business_id' => $businessId,
            'token_number' => 'T-' . str_pad($todayCount + 1, 3, '0', STR_PAD_LEFT),
            'token_time' => now(),
            'token_amount' => $data['token_amount'] ?? null,
            'items' => $data['items'],
            'status' => 'pending',
            'notes' => $data['notes'] ?? null,
        ]);

        return $this->success($token, 'Token created', 201);
    }

    public function show(Request $request, Token $token)
    {
        $this->authorizeForBusiness($request, $token);

        return $this->success($token, 'Token retrieved');
    }

    public function update(Request $request, Token $token)
    {
        $this->authorizeForBusiness($request, $token);
        $data = $request->validate([
            'status' => 'sometimes|in:pending,ready,served,cancelled',
            'notes' => 'nullable|string|max:500',
        ]);
        $token->update($data);

        return $this->success($token, 'Token updated');
    }

    public function markReady(Request $request, Token $token)
    {
        $this->authorizeForBusiness($request, $token);
        $token->update(['status' => 'ready']);

        return $this->success($token, 'Token marked ready');
    }

    public function destroy(Request $request, Token $token)
    {
        $this->authorizeForBusiness($request, $token);
        $token->update(['status' => 'cancelled']);

        return $this->success(null, 'Token cancelled');
    }

    private function authorizeForBusiness(Request $request, Token $token): void
    {
        if ($token->business_id !== $request->user()->business_id) {
            abort(403, 'Unauthorized');
        }
    }
}

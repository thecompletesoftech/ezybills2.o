<?php

namespace App\Http\Controllers\Api;

use App\Models\Kot;
use App\Models\RestaurantTable;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class KotController extends Controller
{
    public function index(Request $request)
    {
        $businessId = $request->user()->business_id;
        $kots = Kot::where('business_id', $businessId)
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->table_id, fn($q) => $q->where('table_id', $request->table_id))
            ->with('table')
            ->latest('kot_time')
            ->get();

        return $this->success($kots, 'KOTs retrieved');
    }

    public function store(Request $request)
    {
        $businessId = $request->user()->business_id;
        $data = $request->validate([
            'table_id' => 'nullable|exists:tables,id',
            'items' => 'required|array|min:1',
            'items.*.name' => 'required|string',
            'items.*.qty' => 'required|numeric|min:0.01',
            'items.*.notes' => 'nullable|string',
            'notes' => 'nullable|string|max:500',
        ]);

        $kot = Kot::create([
            'business_id' => $businessId,
            'table_id' => $data['table_id'] ?? null,
            'kot_number' => 'KOT-' . strtoupper(Str::random(6)),
            'kot_time' => now(),
            'items' => $data['items'],
            'status' => 'pending',
            'notes' => $data['notes'] ?? null,
        ]);

        if ($kot->table_id) {
            RestaurantTable::where('id', $kot->table_id)
                ->update(['status' => 'occupied']);
        }

        $kot->load('table');

        return $this->success($kot, 'KOT created', 201);
    }

    public function show(Request $request, Kot $kot)
    {
        $this->authorizeForBusiness($request, $kot);
        $kot->load('table');

        return $this->success($kot, 'KOT retrieved');
    }

    public function update(Request $request, Kot $kot)
    {
        $this->authorizeForBusiness($request, $kot);
        $data = $request->validate([
            'status' => 'sometimes|in:pending,in_progress,completed,cancelled',
            'items' => 'sometimes|array|min:1',
            'items.*.name' => 'required_with:items|string',
            'items.*.qty' => 'required_with:items|numeric|min:0.01',
            'items.*.notes' => 'nullable|string',
            'notes' => 'nullable|string|max:500',
        ]);
        $kot->update($data);

        if (isset($data['status']) && in_array($data['status'], ['completed', 'cancelled'])) {
            $this->updateTableStatusIfAllKotsDone($kot);
        }

        return $this->success($kot->fresh('table'), 'KOT updated');
    }

    public function complete(Request $request, Kot $kot)
    {
        $this->authorizeForBusiness($request, $kot);
        $kot->update(['status' => 'completed']);
        $this->updateTableStatusIfAllKotsDone($kot);

        return $this->success($kot->fresh('table'), 'KOT completed');
    }

    public function destroy(Request $request, Kot $kot)
    {
        $this->authorizeForBusiness($request, $kot);
        $kot->update(['status' => 'cancelled']);
        $this->updateTableStatusIfAllKotsDone($kot);

        return $this->success(null, 'KOT cancelled');
    }

    private function updateTableStatusIfAllKotsDone(Kot $kot): void
    {
        if (!$kot->table_id) return;

        $hasActive = Kot::where('table_id', $kot->table_id)
            ->whereIn('status', ['pending', 'in_progress'])
            ->exists();

        if (!$hasActive) {
            RestaurantTable::where('id', $kot->table_id)
                ->update(['status' => 'dirty']);
        }
    }

    private function authorizeForBusiness(Request $request, Kot $kot): void
    {
        if ($kot->business_id !== $request->user()->business_id) {
            abort(403, 'Unauthorized');
        }
    }
}

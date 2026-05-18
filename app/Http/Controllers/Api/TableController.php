<?php

namespace App\Http\Controllers\Api;

use App\Models\RestaurantTable;
use Illuminate\Http\Request;

class TableController extends Controller
{
    public function index(Request $request)
    {
        $businessId = $request->user()->business_id;
        $tables = RestaurantTable::where('business_id', $businessId)
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->boolean('active_only'), fn($q) => $q->where('is_active', true))
            ->withCount(['kots as pending_kots_count' => fn($q) => $q->whereIn('status', ['pending', 'in_progress'])])
            ->orderBy('table_number')
            ->get();

        return $this->success($tables, 'Tables retrieved');
    }

    public function store(Request $request)
    {
        $businessId = $request->user()->business_id;
        $data = $request->validate([
            'table_number' => 'required|string|max:20',
            'seats' => 'required|integer|min:1|max:50',
        ]);

        $exists = RestaurantTable::where('business_id', $businessId)
            ->where('table_number', $data['table_number'])
            ->exists();

        if ($exists) {
            return $this->error('Table number already exists', 422);
        }

        $table = RestaurantTable::create([
            ...$data,
            'business_id' => $businessId,
            'status' => 'empty',
            'is_active' => true,
        ]);

        return $this->success($table, 'Table created', 201);
    }

    public function show(Request $request, RestaurantTable $table)
    {
        $this->authorizeForBusiness($request, $table);
        $table->load('activeKots');

        return $this->success($table, 'Table retrieved');
    }

    public function update(Request $request, RestaurantTable $table)
    {
        $this->authorizeForBusiness($request, $table);
        $data = $request->validate([
            'table_number' => 'sometimes|string|max:20',
            'seats' => 'sometimes|integer|min:1|max:50',
            'status' => 'sometimes|in:empty,occupied,reserved,dirty',
            'is_active' => 'sometimes|boolean',
        ]);
        $table->update($data);

        return $this->success($table, 'Table updated');
    }

    public function destroy(Request $request, RestaurantTable $table)
    {
        $this->authorizeForBusiness($request, $table);
        $table->delete();

        return $this->success(null, 'Table deleted');
    }

    public function merge(Request $request, RestaurantTable $table)
    {
        $this->authorizeForBusiness($request, $table);
        $data = $request->validate(['target_table_id' => 'required|exists:tables,id']);

        $target = RestaurantTable::findOrFail($data['target_table_id']);
        $this->authorizeForBusiness($request, $target);

        $target->kots()->whereIn('status', ['pending', 'in_progress'])
            ->update(['table_id' => $table->id]);

        $table->update(['status' => 'occupied']);
        $target->update(['status' => 'empty']);

        return $this->success($table->fresh(['activeKots']), 'Tables merged');
    }

    public function shift(Request $request, RestaurantTable $table)
    {
        $this->authorizeForBusiness($request, $table);
        $data = $request->validate(['target_table_id' => 'required|exists:tables,id']);

        $target = RestaurantTable::findOrFail($data['target_table_id']);
        $this->authorizeForBusiness($request, $target);

        $table->kots()->whereIn('status', ['pending', 'in_progress'])
            ->update(['table_id' => $target->id]);

        $target->update(['status' => 'occupied']);
        $table->update(['status' => 'empty']);

        return $this->success($target->fresh(['activeKots']), 'Table shifted');
    }

    private function authorizeForBusiness(Request $request, RestaurantTable $table): void
    {
        if ($table->business_id !== $request->user()->business_id) {
            abort(403, 'Unauthorized');
        }
    }
}

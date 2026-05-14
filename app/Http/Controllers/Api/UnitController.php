<?php

namespace App\Http\Controllers\Api;

use App\Models\Unit;
use Illuminate\Http\Request;

class UnitController extends Controller
{
    public function index()
    {
        $units = Unit::where('business_id', auth()->user()->business_id)->paginate(20);
        return $this->paginated($units, 'Units retrieved');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'code' => 'nullable|string',
        ]);

        $unit = Unit::create([
            ...$validated,
            'business_id' => auth()->user()->business_id,
        ]);

        return $this->success($unit, 'Unit created', 201);
    }

    public function show(Unit $unit)
    {
        return $this->success($unit, 'Unit retrieved');
    }

    public function update(Request $request, Unit $unit)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string',
            'code' => 'nullable|string',
        ]);

        $unit->update($validated);
        return $this->success($unit, 'Unit updated');
    }

    public function destroy(Unit $unit)
    {
        $unit->delete();
        return $this->success(null, 'Unit deleted');
    }
}

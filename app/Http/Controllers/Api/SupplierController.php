<?php

namespace App\Http\Controllers\Api;

use App\Models\Supplier;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index()
    {
        $suppliers = Supplier::where('business_id', auth()->user()->business_id)->paginate(20);
        return $this->paginated($suppliers, 'Suppliers retrieved');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'phone' => 'nullable|string',
            'email' => 'nullable|email',
            'gst_number' => 'nullable|string',
            'address' => 'nullable|string',
        ]);

        $supplier = Supplier::create([
            ...$validated,
            'business_id' => auth()->user()->business_id,
        ]);

        return $this->success($supplier, 'Supplier created', 201);
    }

    public function show(Supplier $supplier)
    {
        $supplier->load('purchases', 'ledger');
        return $this->success($supplier, 'Supplier retrieved');
    }

    public function update(Request $request, Supplier $supplier)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string',
            'phone' => 'nullable|string',
            'email' => 'nullable|email',
            'gst_number' => 'nullable|string',
            'address' => 'nullable|string',
        ]);

        $supplier->update($validated);
        return $this->success($supplier, 'Supplier updated');
    }

    public function destroy(Supplier $supplier)
    {
        $supplier->delete();
        return $this->success(null, 'Supplier deleted');
    }

    public function ledger(Supplier $supplier)
    {
        $ledger = $supplier->ledger()->orderBy('created_at', 'desc')->paginate(20);
        return $this->paginated($ledger, 'Supplier ledger retrieved');
    }
}

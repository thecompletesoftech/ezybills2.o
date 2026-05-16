<?php

namespace App\Http\Controllers\Api;

use App\Models\TaxRate;
use Illuminate\Http\Request;

class TaxRateController extends Controller
{
    public function index()
    {
        $taxes = TaxRate::where('business_id', auth()->user()->business_id)
            ->orderBy('rate')
            ->get();
        return $this->success($taxes, 'Tax rates retrieved');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'      => 'required|string|max:100',
            'rate'      => 'required|numeric|min:0|max:100',
            'type'      => 'nullable|string|in:GST,IGST,CGST+SGST,CESS,Other',
            'is_active' => 'nullable|boolean',
        ]);

        $tax = TaxRate::create([...$validated, 'business_id' => auth()->user()->business_id]);
        return $this->success($tax, 'Tax rate created', 201);
    }

    public function update(Request $request, TaxRate $taxRate)
    {
        $this->authorizeBusinessResource($taxRate->business_id);

        $validated = $request->validate([
            'name'      => 'sometimes|string|max:100',
            'rate'      => 'sometimes|numeric|min:0|max:100',
            'type'      => 'nullable|string|in:GST,IGST,CGST+SGST,CESS,Other',
            'is_active' => 'nullable|boolean',
        ]);

        $taxRate->update($validated);
        return $this->success($taxRate, 'Tax rate updated');
    }

    public function destroy(TaxRate $taxRate)
    {
        $this->authorizeBusinessResource($taxRate->business_id);
        $taxRate->delete();
        return $this->success(null, 'Tax rate deleted');
    }
}

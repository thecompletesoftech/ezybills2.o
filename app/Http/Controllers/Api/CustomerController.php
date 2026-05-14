<?php

namespace App\Http\Controllers\Api;

use App\Models\Customer;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $customers = Customer::where('business_id', auth()->user()->business_id)
            ->with('group')
            ->paginate(20);
        return $this->paginated($customers, 'Customers retrieved');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'phone' => 'nullable|string',
            'email' => 'nullable|email',
            'gst_number' => 'nullable|string',
            'address' => 'nullable|string',
            'group_id' => 'nullable|exists:customer_groups,id',
            'credit_limit' => 'nullable|numeric',
        ]);

        $customer = Customer::create([
            ...$validated,
            'business_id' => auth()->user()->business_id,
        ]);

        return $this->success($customer, 'Customer created', 201);
    }

    public function show(Customer $customer)
    {
        $customer->load('group', 'invoices', 'ledger');
        return $this->success($customer, 'Customer retrieved');
    }

    public function update(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string',
            'phone' => 'nullable|string',
            'email' => 'nullable|email',
            'gst_number' => 'nullable|string',
            'address' => 'nullable|string',
            'group_id' => 'nullable|exists:customer_groups,id',
            'credit_limit' => 'nullable|numeric',
        ]);

        $customer->update($validated);
        return $this->success($customer, 'Customer updated');
    }

    public function destroy(Customer $customer)
    {
        $customer->delete();
        return $this->success(null, 'Customer deleted');
    }

    public function ledger(Customer $customer)
    {
        $ledger = $customer->ledger()->orderBy('created_at', 'desc')->paginate(20);
        return $this->paginated($ledger, 'Customer ledger retrieved');
    }

    public function purchaseHistory(Customer $customer)
    {
        $purchases = $customer->invoices()->with('items')->paginate(20);
        return $this->paginated($purchases, 'Purchase history retrieved');
    }
}

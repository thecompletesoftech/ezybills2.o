<?php

namespace App\Http\Controllers\Api;

use App\Models\Stock;
use App\Services\InventoryService;
use Illuminate\Http\Request;

class StockController extends Controller
{
    private $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    public function index()
    {
        $stock = Stock::where('business_id', auth()->user()->business_id)
            ->with('product')
            ->paginate(20);
        return $this->paginated($stock, 'Stock retrieved');
    }

    public function show(Stock $stock)
    {
        $stock->load('product', 'movements');
        return $this->success($stock, 'Stock retrieved');
    }

    public function adjust(Request $request, Stock $stock)
    {
        $validated = $request->validate([
            'new_quantity' => 'required|numeric',
        ]);

        try {
            $this->inventoryService->adjustStock(
                $stock->product_id,
                auth()->user()->business_id,
                $validated['new_quantity']
            );
            return $this->success(null, 'Stock adjusted');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 400);
        }
    }
}

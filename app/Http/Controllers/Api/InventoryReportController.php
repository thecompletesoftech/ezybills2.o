<?php

namespace App\Http\Controllers\Api;

class InventoryReportController extends Controller
{
    public function inventory()
    {
        return $this->success([], 'Inventory report');
    }
}

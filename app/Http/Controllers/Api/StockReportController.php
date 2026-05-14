<?php

namespace App\Http\Controllers\Api;

class StockReportController extends Controller
{
    public function summary()
    {
        return $this->success([], 'Stock summary');
    }

    public function ledger()
    {
        return $this->success([], 'Stock ledger');
    }
}

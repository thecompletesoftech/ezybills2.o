<?php

namespace App\Http\Controllers\Api;

class PurchaseReportController extends Controller
{
    public function purchase()
    {
        return $this->success([], 'Purchase report');
    }
}

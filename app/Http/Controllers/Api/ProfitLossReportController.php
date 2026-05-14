<?php

namespace App\Http\Controllers\Api;

class ProfitLossReportController extends Controller
{
    public function calculate()
    {
        return $this->success([], 'Profit and loss report');
    }
}

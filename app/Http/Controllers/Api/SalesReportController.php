<?php

namespace App\Http\Controllers\Api;

class SalesReportController extends Controller
{
    public function sales()
    {
        return $this->success([], 'Sales report');
    }
}

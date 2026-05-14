<?php

namespace App\Http\Controllers\Api;

class DueReportController extends Controller
{
    public function customerDue()
    {
        return $this->success([], 'Customer due report');
    }
}

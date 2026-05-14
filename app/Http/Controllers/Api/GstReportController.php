<?php

namespace App\Http\Controllers\Api;

class GstReportController extends Controller
{
    public function summary()
    {
        return $this->success([], 'GST report');
    }
}

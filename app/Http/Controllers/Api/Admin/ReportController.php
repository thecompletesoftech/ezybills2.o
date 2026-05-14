<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;

class ReportController extends Controller
{
    public function growth()
    {
        return response()->json(['data' => []]);
    }
}

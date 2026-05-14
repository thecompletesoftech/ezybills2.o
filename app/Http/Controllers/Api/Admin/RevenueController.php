<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;

class RevenueController extends Controller
{
    public function index()
    {
        return response()->json(['data' => []]);
    }
}

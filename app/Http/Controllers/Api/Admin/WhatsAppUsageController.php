<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;

class WhatsAppUsageController extends Controller
{
    public function index()
    {
        return response()->json(['data' => []]);
    }
}

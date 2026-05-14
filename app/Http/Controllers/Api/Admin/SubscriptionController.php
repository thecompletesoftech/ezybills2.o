<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;

class SubscriptionController extends Controller
{
    public function index()
    {
        return response()->json(['data' => []]);
    }

    public function show()
    {
        return response()->json(['data' => []]);
    }

    public function extend()
    {
        return response()->json(['success' => true]);
    }
}

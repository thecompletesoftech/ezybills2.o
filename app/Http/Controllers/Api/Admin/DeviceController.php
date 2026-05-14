<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;

class DeviceController extends Controller
{
    public function index()
    {
        return response()->json(['data' => []]);
    }

    public function show()
    {
        return response()->json(['data' => []]);
    }

    public function reset()
    {
        return response()->json(['success' => true]);
    }

    public function forceLogout()
    {
        return response()->json(['success' => true]);
    }
}

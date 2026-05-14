<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;

class SettingsController extends Controller
{
    public function show()
    {
        return response()->json(['data' => []]);
    }

    public function update()
    {
        return response()->json(['success' => true]);
    }
}

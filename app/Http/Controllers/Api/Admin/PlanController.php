<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;

class PlanController extends Controller
{
    public function index()
    {
        return response()->json(['data' => []]);
    }

    public function store()
    {
        return response()->json(['data' => []], 201);
    }

    public function show()
    {
        return response()->json(['data' => []]);
    }

    public function update()
    {
        return response()->json(['data' => []]);
    }

    public function destroy()
    {
        return response()->json(['success' => true]);
    }
}

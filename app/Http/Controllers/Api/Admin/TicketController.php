<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;

class TicketController extends Controller
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

    public function assign()
    {
        return response()->json(['success' => true]);
    }

    public function resolve()
    {
        return response()->json(['success' => true]);
    }
}

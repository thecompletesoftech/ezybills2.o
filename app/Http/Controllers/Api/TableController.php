<?php

namespace App\Http\Controllers\Api;

class TableController extends Controller
{
    public function index()
    {
        return $this->success([], 'Tables retrieved');
    }

    public function store()
    {
        return $this->success([], 'Table created', 201);
    }

    public function show()
    {
        return $this->success([], 'Table retrieved');
    }

    public function merge()
    {
        return $this->success([], 'Tables merged');
    }

    public function shift()
    {
        return $this->success([], 'Table shifted');
    }
}

<?php

namespace App\Http\Controllers\Api;

class TokenController extends Controller
{
    public function index()
    {
        return $this->success([], 'Tokens retrieved');
    }

    public function store()
    {
        return $this->success([], 'Token created', 201);
    }

    public function show()
    {
        return $this->success([], 'Token retrieved');
    }

    public function markReady()
    {
        return $this->success([], 'Token marked ready');
    }
}

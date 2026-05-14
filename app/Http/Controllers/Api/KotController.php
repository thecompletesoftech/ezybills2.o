<?php

namespace App\Http\Controllers\Api;

class KotController extends Controller
{
    public function index()
    {
        return $this->success([], 'KOTs retrieved');
    }

    public function store()
    {
        return $this->success([], 'KOT created', 201);
    }

    public function show()
    {
        return $this->success([], 'KOT retrieved');
    }

    public function complete()
    {
        return $this->success([], 'KOT completed');
    }
}

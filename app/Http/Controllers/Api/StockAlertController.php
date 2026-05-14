<?php

namespace App\Http\Controllers\Api;

class StockAlertController extends Controller
{
    public function index()
    {
        return $this->success([], 'Stock alerts');
    }
}

<?php

namespace App\Http\Controllers\Api;

class CustomerPaymentController extends Controller
{
    public function recordPayment()
    {
        return $this->success([], 'Payment recorded');
    }
}

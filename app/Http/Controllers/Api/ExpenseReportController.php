<?php

namespace App\Http\Controllers\Api;

class ExpenseReportController extends Controller
{
    public function expense()
    {
        return $this->success([], 'Expense report');
    }
}

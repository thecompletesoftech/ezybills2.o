<?php

namespace App\Http\Controllers\Api;

class PrinterSettingsController extends Controller
{
    public function update()
    {
        return $this->success([], 'Printer settings updated');
    }
}

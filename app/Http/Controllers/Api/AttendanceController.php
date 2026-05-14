<?php

namespace App\Http\Controllers\Api;

class AttendanceController extends Controller
{
    public function record()
    {
        return $this->success([], 'Attendance recorded');
    }
}

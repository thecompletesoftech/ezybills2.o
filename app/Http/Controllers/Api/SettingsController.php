<?php

namespace App\Http\Controllers\Api;

class SettingsController extends Controller
{
    public function show()
    {
        return $this->success([], 'Settings retrieved');
    }

    public function update()
    {
        return $this->success([], 'Settings updated');
    }
}

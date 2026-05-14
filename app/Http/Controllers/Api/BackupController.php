<?php

namespace App\Http\Controllers\Api;

class BackupController extends Controller
{
    public function backup()
    {
        return $this->success([], 'Backup created');
    }
}

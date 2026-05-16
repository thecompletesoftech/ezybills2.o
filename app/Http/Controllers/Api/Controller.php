<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller as BaseController;

abstract class Controller extends BaseController
{
    protected function authorizeBusinessResource(int $resourceBusinessId): void
    {
        if ($resourceBusinessId !== auth()->user()->business_id) {
            abort(403, 'Unauthorized');
        }
    }
}

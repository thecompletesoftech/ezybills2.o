<?php

namespace App\Http\Controllers\Api;

class WhatsAppController extends Controller
{
    public function sendTemplate()
    {
        return $this->success([], 'Template sent');
    }

    public function getTemplates()
    {
        return $this->success([], 'Templates retrieved');
    }

    public function messageLogs()
    {
        return $this->success([], 'Message logs retrieved');
    }
}

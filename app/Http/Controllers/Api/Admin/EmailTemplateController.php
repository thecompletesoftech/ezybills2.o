<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\EmailTemplate;
use Illuminate\Http\Request;

class EmailTemplateController extends Controller
{
    public function index()
    {
        $templates = EmailTemplate::orderBy('key')->get();
        return $this->success($templates, 'Email templates retrieved');
    }

    public function show(EmailTemplate $emailTemplate)
    {
        return $this->success($emailTemplate, 'Template retrieved');
    }

    public function update(Request $request, EmailTemplate $emailTemplate)
    {
        $validated = $request->validate([
            'name'      => 'sometimes|string|max:100',
            'subject'   => 'sometimes|string|max:255',
            'body_html' => 'sometimes|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $emailTemplate->update($validated);

        return $this->success($emailTemplate->fresh(), 'Template updated');
    }

    public function preview(Request $request, EmailTemplate $emailTemplate)
    {
        // Replace variables with sample values for preview
        $sampleVars = [];
        foreach ($emailTemplate->variables ?? [] as $var) {
            $sampleVars[$var] = "[{$var}]";
        }

        $subject = $emailTemplate->subject;
        $body    = $emailTemplate->body_html;

        foreach ($sampleVars as $k => $v) {
            $subject = str_replace("{{{$k}}}", $v, $subject);
            $body    = str_replace("{{{$k}}}", $v, $body);
        }

        return $this->success([
            'subject'  => $subject,
            'body_html' => $body,
        ], 'Preview generated');
    }
}

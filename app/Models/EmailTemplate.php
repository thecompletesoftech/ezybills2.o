<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailTemplate extends Model
{
    protected $fillable = ['key', 'name', 'subject', 'body_html', 'variables', 'is_active'];

    protected $casts = [
        'variables' => 'array',
        'is_active' => 'boolean',
    ];

    public static function render(string $key, array $vars = []): ?array
    {
        $template = static::where('key', $key)->where('is_active', true)->first();
        if (!$template) {
            return null;
        }

        $subject = $template->subject;
        $body    = $template->body_html;

        foreach ($vars as $placeholder => $value) {
            $subject = str_replace("{{{$placeholder}}}", $value, $subject);
            $body    = str_replace("{{{$placeholder}}}", $value, $body);
        }

        return ['subject' => $subject, 'body' => $body];
    }
}

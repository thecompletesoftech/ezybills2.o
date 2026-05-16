<?php

namespace App\Jobs;

use App\Mail\PromotionalMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendPromoEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(
        public string $email,
        public string $name,
        public string $subject,
        public string $bodyHtml,
    ) {}

    public function handle(): void
    {
        Mail::to($this->email)->send(
            new PromotionalMail($this->subject, $this->name, $this->bodyHtml)
        );
    }
}

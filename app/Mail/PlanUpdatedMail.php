<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PlanUpdatedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $userName,
        public string $businessName,
        public string $planName,
        public string $expiryDate,
        public string $billingCycle,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your EzyBills Plan Has Been Updated');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.plan-updated');
    }
}

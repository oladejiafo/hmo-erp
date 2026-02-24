<?php
// app/Mail/EnrolleeWelcomeMail.php

namespace App\Mail;

use App\Models\Enrollee;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EnrolleeWelcomeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Enrollee $enrollee,
        public string $password
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Welcome to HMO Member Portal - Your Login Credentials',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.enrollee_welcome',
            with: [
                'name' => $this->enrollee->first_name,
                'email' => $this->enrollee->email,
                'password' => $this->password,
                'login_url' => url('/login'),
            ],
        );
    }
}
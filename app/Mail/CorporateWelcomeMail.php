<?php
// app/Mail/CorporateWelcomeMail.php

namespace App\Mail;

use App\Models\Corporate;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CorporateWelcomeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Corporate $corporate,
        public User $user,
        public string $password
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Corporate Portal Access - Your Login Credentials',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.corporate_welcome',
            with: [
                'name' => $this->user->name,
                'email' => $this->user->email,
                'password' => $this->password,
                'corporate_name' => $this->corporate->name,
                'login_url' => url('/login'),
            ],
        );
    }
}
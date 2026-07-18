<?php
/**
 * NEW FILE — app/Mail/ProviderWelcomeMail.php
 *
 * ASSUMPTION FLAGGED: written from the constructor shape implied by
 * `new EnrolleeWelcomeMail($enrollee, $tempPassword)` — I have not seen
 * the real EnrolleeWelcomeMail.php. Align the view path and content
 * structure to match it once you send that file, so providers get a
 * visually consistent welcome email to enrollees/corporates rather than
 * a third distinct template style.
 */

namespace App\Mail;

use App\Models\HealthCareProvider;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ProviderWelcomeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public HealthCareProvider $hcp,
        public string $tempPassword
    ) {}

    public function build()
    {
        return $this->subject('Your Provider Portal Account — ' . config('app.name'))
            ->view('emails.provider_welcome') // NEW view, doesn't exist yet either
            ->with([
                'hcpName' => $this->hcp->name,
                'email' => $this->hcp->email,
                'tempPassword' => $this->tempPassword,
                'loginUrl' => config('app.frontend_url', config('app.url')) . '/login',
            ]);
    }
}

<?php

namespace App\Services;

use App\Models\Enrollee;
use App\Models\EnrolleeCard;
use Illuminate\Support\Facades\Storage;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use Illuminate\Support\Facades\Auth;

class EnrolleeCardService
{
    /**
     * Issue a new card for an enrollee.
     * Deactivates any existing active card before issuing new one.
     */
    public function issue(Enrollee $enrollee, ?int $issuedBy = null, ?string $reason = null): EnrolleeCard
    {
        // Deactivate current active card
        EnrolleeCard::where('enrollee_id', $enrollee->id)
            ->where('status', 'active')
            ->update(['status' => 'replaced']);

        $cardNumber = $this->generateCardNumber($enrollee);
        $qrPayload  = $this->buildQrPayload($enrollee, $cardNumber);
        $qrPath     = $this->generateQrImage($enrollee->enrollee_id, $qrPayload);

        return EnrolleeCard::create([
            'enrollee_id'        => $enrollee->id,
            'card_number'        => $cardNumber,
            'qr_code_data'       => $qrPayload,
            'qr_image_path'      => $qrPath,
            'status'             => 'active',
            'issued_at'          => now()->toDateString(),
            'expires_at'         => $enrollee->expiry_date?->toDateString() ?? now()->addYear()->toDateString(),
            'issued_by'          => $issuedBy ?? Auth::id(),
            'replacement_reason' => $reason,
        ]);
    }

    protected function generateCardNumber(Enrollee $enrollee): string
    {
        return EnrolleeCard::generateUniqueId('CARD', 'card_number', 7);
    }

    /**
     * The QR payload is a signed JSON object that HCP scanners decode.
     * It contains enough info to verify eligibility without an internet connection.
     */
    protected function buildQrPayload(Enrollee $enrollee, string $cardNumber): string
    {
        $payload = [
            'enrollee_id'  => $enrollee->enrollee_id,
            'card_number'  => $cardNumber,
            'name'         => $enrollee->first_name . ' ' . $enrollee->last_name,
            'plan_id'      => $enrollee->plan_id,
            'expiry'       => $enrollee->expiry_date?->format('Y-m-d'),
            'corporate_id' => $enrollee->corporate_id,
            'issued'       => now()->toDateString(),
            // Checksum for tamper detection - not a security measure, just integrity
            'chk'          => substr(md5($enrollee->enrollee_id . $cardNumber . config('app.key')), 0, 8),
        ];

        return base64_encode(json_encode($payload));
    }

    protected function generateQrImage(string $enrolleeId, string $qrData): string
    {
        $filename = "qr-codes/{$enrolleeId}-" . now()->timestamp . ".png";

        $qrImage = QrCode::format('png')
            ->size(300)
            ->errorCorrection('H')
            ->generate($qrData);

        Storage::disk(config('hmo.storage_disk', 'local'))
               ->put($filename, $qrImage);

        return $filename;
    }
}
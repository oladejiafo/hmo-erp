<?php
/**
 * FILE: app/Services/Telemedicine/DailyVideoService.php
 *
 * Thin wrapper around Daily.co's REST API - https://docs.daily.co/reference/rest-api
 * Chosen over Twilio/Agora for Phase 1 because it needs no client-side SDK
 * complexity: a private room + a signed meeting token is enough to embed
 * a full video UI in an <iframe>, which is what TelemedicineRoomPage.jsx
 * and ProviderConsultRoomPage.jsx use.
 *
 * NOT TESTED against a live Daily.co account - matches their published API
 * shape exactly, but test against a real sandbox room before relying on
 * this for a real consultation.
 */
namespace App\Services\Telemedicine;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class DailyVideoService
{
    private string $apiKey;
    private string $baseUrl;

    public function __construct()
    {
        $this->apiKey  = config('services.daily.api_key', '');
        $this->baseUrl = config('services.daily.base_url', 'https://api.daily.co/v1');
    }

    public function isConfigured(): bool
    {
        return ! empty($this->apiKey);
    }

    /**
     * Create a new private room. Rooms expire automatically (Daily deletes
     * them server-side) so no manual cleanup job is needed.
     *
     * @return array{name: string, url: string}
     */
    public function createRoom(string $roomNamePrefix, int $expiryMinutes = 180): array
    {
        $roomName = $roomNamePrefix . '-' . Str::lower(Str::random(8));

        $response = Http::withToken($this->apiKey)
            ->timeout(20)
            ->post("{$this->baseUrl}/rooms", [
                'name'       => $roomName,
                'privacy'    => 'private',
                'properties' => [
                    'exp'                       => now()->addMinutes($expiryMinutes)->timestamp,
                    'enable_chat'                => true,
                    'enable_screenshare'         => true,
                    'enable_prejoin_ui'          => true,
                    'max_participants'           => 4, // doctor + enrollee + up to 2 observers
                    'eject_at_room_exp'          => true,
                ],
            ]);

        if (! $response->successful()) {
            Log::error('Daily.co room creation failed', ['body' => $response->body()]);
            throw new \RuntimeException('Could not create the video session. Please try again shortly.');
        }

        $body = $response->json();

        return [
            'name' => $body['name'],
            'url'  => $body['url'],
        ];
    }

    /**
     * Issue a signed join token scoped to one room and one participant.
     * The owner token (doctor) gets host controls (can end the call for
     * everyone, mute participants). The enrollee token doesn't.
     */
    public function createMeetingToken(string $roomName, string $userName, bool $isOwner, int $expiryMinutes = 180): string
    {
        $response = Http::withToken($this->apiKey)
            ->timeout(20)
            ->post("{$this->baseUrl}/meeting-tokens", [
                'properties' => [
                    'room_name' => $roomName,
                    'user_name' => $userName,
                    'is_owner'  => $isOwner,
                    'exp'       => now()->addMinutes($expiryMinutes)->timestamp,
                ],
            ]);

        if (! $response->successful()) {
            Log::error('Daily.co token creation failed', ['body' => $response->body()]);
            throw new \RuntimeException('Could not create your join link. Please try again shortly.');
        }

        return $response->json()['token'];
    }

    public function joinUrl(string $roomUrl, string $token): string
    {
        return $roomUrl . '?t=' . $token;
    }
}
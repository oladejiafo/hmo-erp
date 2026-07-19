<?php

/**
 * ERP - config/licensing.php
 *
 * Configuration for the license validation client.
 * All sensitive values come from .env - never hardcode here.
 *
 * FILE: config/licensing.php  (in each deployed ERP instance)
 */

return [
    /*
    | The license key issued by the software vendor.
    | Set in .env: LICENSING_KEY=HMS-XXXX-XXXX-XXXX-XXXX
    |
    | Leave empty for unlicensed installations (restricted from the start).
    */
    'license_key' => env('LICENSING_KEY', ''),

    /*
    | URL of the central licensing server.
    | Set in .env: LICENSING_SERVER_URL=https://license.yourdomain.com
    */
    'server_url' => env('LICENSING_SERVER_URL', ''),

    /*
    | RSA public key from the licensing server.
    | Used to verify signed tokens - cannot forge tokens with this.
    | Set in .env: LICENSING_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n"
    |
    | Obtain this by running on the licensing server:
    |   php artisan license:generate-keypair
    */
    'public_key' => str_replace('\n', "\n", env('LICENSING_PUBLIC_KEY', '')),

    /*
    | Vendor contact shown to users in restricted mode.
    */
    'vendor_contact' => env('LICENSING_VENDOR_CONTACT', 'support@yourdomain.com'),

    /*
    | Whether to enforce license restrictions.
    | Set to false in local/development environments.
    | NEVER set to false in production.
    */
    'enforce' => env('LICENSING_ENFORCE', true),
];
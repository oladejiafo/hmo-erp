<?php

return [
    'url'          => env('G8_AI_URL',          'https://chatbot.g8brooks.com'),
    'token'        => env('G8_AI_TOKEN',         ''),
    'product_slug' => env('G8_AI_PRODUCT_SLUG',  'nexum_health'),
    'timeout'      => env('G8_AI_TIMEOUT',        30),
    'cache_enabled'=> env('G8_AI_CACHE_ENABLED',  false),
];
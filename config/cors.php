<?php

return [
    'paths' => ['api/*', 'auth/*', 'login', 'logout', 'sanctum/csrf-cookie'],
    
    'allowed_methods' => ['*'],
    
    'allowed_origins' => [
        'http://127.0.0.1:8003',
        'http://localhost:8003',
    ],
    // 'allowed_origins' => ['*'], // For development

    // 'allowed_origins' => [
    //     'https://hmo.g8brooks.com',
    //     'https://get.g8brooks.com',
    // ],

    'allowed_origins_patterns' => [],
    
    'allowed_headers' => ['*'],
    
    'exposed_headers' => [],
    
    'max_age' => 0,
    
    // 'supports_credentials' => true,
    'supports_credentials' => false,
];

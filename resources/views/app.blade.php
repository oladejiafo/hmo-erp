<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="csrf-token" content="{{ csrf_token() }}" />
    
    {{-- Primary Meta Tags --}}
    <title>G8 NEXUM | HMO Management Platform for Nigerian Health Maintenance Organizations</title>
    <meta name="title" content="G8 NEXUM - Complete HMO Management Platform for Nigeria" />
    <meta name="description" content="Enterprise HMO management platform built for Nigerian Health Maintenance Organizations. Streamline claims processing, pre-authorizations, capitation, and provider management in one unified system." />
    <meta name="keywords" content="HMO software Nigeria, health insurance platform, claims management, pre-authorization system, capitation management, NHIA compliance, healthcare administration" />
    <meta name="author" content="G8 Brooks Technology" />
    <meta name="robots" content="index, follow" />
    
    {{-- Open Graph / Facebook --}}
    <meta property="og:type" content="website" />
    <meta property="og:url" content="{{ url()->current() }}" />
    <meta property="og:title" content="G8 NEXUM - HMO Management Platform for Nigeria" />
    <meta property="og:description" content="Complete HMO operations platform: claims, pre-authorizations, capitation, provider portals, and NHIA-compliant reporting." />
    <meta property="og:image" content="{{ asset('images/og-image.png') }}" />

    {{-- Twitter --}}
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="{{ url()->current() }}" />
    <meta property="twitter:title" content="G8 NEXUM - HMO Management Platform for Nigeria" />
    <meta property="twitter:description" content="Enterprise HMO platform built for Nigerian Health Maintenance Organizations." />
    <meta property="twitter:image" content="{{ asset('images/twitter-image.png') }}" />

    {{-- Favicon --}}
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><path d='M16 2L28 8V16C28 22.6 22.8 28.6 16 30C9.2 28.6 4 22.6 4 16V8L16 2Z' fill='%231e3a5f'/><path d='M13 16H19M16 13V19' stroke='white' stroke-width='2.5' stroke-linecap='round'/></svg>" />
    <link rel="alternate icon" href="{{ asset('favicon.ico') }}" />
    <link rel="apple-touch-icon" href="{{ asset('apple-touch-icon.png') }}" />

    {{-- Bootstrap Icons --}}
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css" />

    {{-- Vite --}}
    @viteReactRefresh
    @vite(['resources/js/app.jsx'])
</head>
<body>
    <div id="app"></div>
</body>
</html>
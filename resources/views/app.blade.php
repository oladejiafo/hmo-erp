<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="csrf-token" content="{{ csrf_token() }}" />
    <title>HMO ERP — Health Management Operations Platform</title>

    {{-- Favicon --}}
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><path d='M16 2L28 8V16C28 22.6 22.8 28.6 16 30C9.2 28.6 4 22.6 4 16V8L16 2Z' fill='%231e3a5f'/><path d='M13 16H19M16 13V19' stroke='white' stroke-width='2.5' stroke-linecap='round'/></svg>" />

    {{-- Bootstrap Icons (for any <i class="bi ..."> usage) --}}
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css" />

    {{-- Vite: injects CSS and JS with cache-busting hashes in production,
         or live HMR dev server URLs in development --}}
    @viteReactRefresh
    @vite(['resources/js/app.jsx'])
</head>
<body>
    {{-- The single DOM node React mounts into.
         Must match document.getElementById('app') in resources/js/app.jsx --}}
    <div id="app"></div>
</body>
</html>
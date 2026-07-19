{{-- NEW FILE - resources/views/emails/provider_welcome.blade.php --}}
{{-- Deliberately plain - swap for your real branded template once you --}}
{{-- send over EnrolleeWelcomeMail's view so this matches its style. --}}
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; color: #1a202c; line-height: 1.6;">
    <h2>Welcome, {{ $hcpName }}</h2>
    <p>Your healthcare provider portal account has been created.</p>
    <p>
        <strong>Email:</strong> {{ $email }}<br>
        <strong>Temporary password:</strong> {{ $tempPassword }}
    </p>
    <p>You'll be asked to set a new password the first time you log in.</p>
    <p><a href="{{ $loginUrl }}">Log in to the Provider Portal</a></p>
</body>
</html>

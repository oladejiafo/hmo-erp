{{-- resources/views/emails/corporate_welcome.blade.php --}}
<!DOCTYPE html>
<html>
<head>
    <title>Corporate Portal Access</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0f4c81, #1565c0); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h2>Corporate Portal Access</h2>
        </div>
        
        <div style="border: 1px solid #ddd; padding: 20px; border-radius: 0 0 10px 10px;">
            <p>Hello <strong>{{ $name }}</strong>,</p>
            
            <p>Your company <strong>{{ $corporate_name }}</strong> has been registered with our HMO. You now have access to the Corporate Portal where you can manage your employees' health coverage.</p>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Your Login Credentials:</h3>
                <p><strong>Email:</strong> {{ $email }}</p>
                <p><strong>Temporary Password:</strong> <code style="background: #eee; padding: 3px 6px; border-radius: 3px;">{{ $password }}</code></p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{ $login_url }}" style="background: #0f4c81; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    Login to Corporate Portal
                </a>
            </div>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0;">
                <p style="margin: 0; color: #856404;">
                    <strong>⚠️ Important:</strong> You will be required to change your password the first time you log in.
                </p>
            </div>
            
            <p><strong>What you can do in the portal:</strong></p>
            <ul>
                <li>View and manage enrolled employees</li>
                <li>Track claims</li>
                <li>View invoices</li>
                <li>Update company profile</li>
            </ul>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            
            <p style="font-size: 12px; color: #666;">
                This is an automated message, please do not reply.
            </p>
        </div>
    </div>
</body>
</html>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reset your EzyBills password</title>
  <style>
    body { margin:0; padding:0; background:#f4f7fb; font-family:'Segoe UI',Arial,sans-serif; color:#1a1a2e; }
    .wrapper { max-width:520px; margin:40px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.08); }
    .header { background:#0066CC; padding:32px 40px; text-align:center; }
    .header h1 { margin:0; color:#fff; font-size:24px; font-weight:700; letter-spacing:-.5px; }
    .header p  { margin:4px 0 0; color:#b3d4f5; font-size:13px; }
    .body { padding:36px 40px; }
    .body p  { margin:0 0 16px; font-size:15px; line-height:1.6; color:#444; }
    .btn-wrap { text-align:center; margin:28px 0; }
    .btn { display:inline-block; background:#DC2626; color:#fff; text-decoration:none;
           padding:14px 36px; border-radius:10px; font-weight:600; font-size:15px; letter-spacing:.2px; }
    .link-box { background:#f4f7fb; border-radius:8px; padding:12px 16px; font-size:12px;
                color:#666; word-break:break-all; margin-top:8px; }
    .footer { background:#f9fafb; padding:20px 40px; text-align:center; border-top:1px solid #eee; }
    .footer p { margin:0; font-size:12px; color:#999; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>EzyBills POS</h1>
      <p>Password Reset Request</p>
    </div>
    <div class="body">
      <p>Hi <strong>{{ $userName }}</strong>,</p>
      <p>We received a request to reset your EzyBills account password. Click the button below to choose a new password.</p>
      <div class="btn-wrap">
        <a href="{{ $resetUrl }}" class="btn">Reset Password</a>
      </div>
      <p style="font-size:13px;color:#888;">If the button doesn't work, copy and paste this link into your browser:</p>
      <div class="link-box">{{ $resetUrl }}</div>
      <p style="margin-top:24px;font-size:13px;color:#aaa;">
        This link expires in <strong>60 minutes</strong>. If you didn't request a password reset, you can safely ignore this email.
      </p>
    </div>
    <div class="footer">
      <p>&copy; {{ date('Y') }} EzyBills. All rights reserved.</p>
    </div>
  </div>
</body>
</html>

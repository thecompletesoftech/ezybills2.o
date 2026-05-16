<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>{{ $subject }}</title>
  <style>
    body { margin:0; padding:0; background:#f4f7fb; font-family:'Segoe UI',Arial,sans-serif; color:#1a1a2e; }
    .wrapper { max-width:520px; margin:40px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.08); }
    .header { background:linear-gradient(135deg,#0066CC 0%,#7C3AED 100%); padding:32px 40px; text-align:center; }
    .header h1 { margin:0; color:#fff; font-size:24px; font-weight:700; }
    .header p  { margin:4px 0 0; color:rgba(255,255,255,0.8); font-size:13px; }
    .body { padding:36px 40px; font-size:15px; line-height:1.7; color:#444; }
    .footer { background:#f9fafb; padding:20px 40px; text-align:center; border-top:1px solid #eee; }
    .footer p { margin:0; font-size:12px; color:#999; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>EzyBills POS</h1>
      <p>Special Offer Just for You</p>
    </div>
    <div class="body">
      <p>Hi <strong>{{ $recipientName }}</strong>,</p>
      {!! $bodyHtml !!}
    </div>
    <div class="footer">
      <p>&copy; {{ date('Y') }} EzyBills. All rights reserved.</p>
    </div>
  </div>
</body>
</html>

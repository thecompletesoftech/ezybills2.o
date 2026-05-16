<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Plan Updated — EzyBills</title>
  <style>
    body { margin:0; padding:0; background:#f4f7fb; font-family:'Segoe UI',Arial,sans-serif; color:#1a1a2e; }
    .wrapper { max-width:520px; margin:40px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.08); }
    .header { background:#0066CC; padding:32px 40px; text-align:center; }
    .header h1 { margin:0; color:#fff; font-size:24px; font-weight:700; }
    .header p  { margin:4px 0 0; color:#b3d4f5; font-size:13px; }
    .body { padding:36px 40px; }
    .body p  { margin:0 0 16px; font-size:15px; line-height:1.6; color:#444; }
    .plan-box { background:#EFF6FF; border:1px solid #BFDBFE; border-radius:12px; padding:20px 24px; margin:20px 0; }
    .plan-box .row { margin-bottom:12px; }
    .plan-box .row:last-child { margin-bottom:0; }
    .plan-box .label { font-size:12px; color:#6B7280; margin-bottom:2px; }
    .plan-box .value { font-size:15px; font-weight:600; color:#1E40AF; }
    .footer { background:#f9fafb; padding:20px 40px; text-align:center; border-top:1px solid #eee; }
    .footer p { margin:0; font-size:12px; color:#999; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>EzyBills POS</h1>
      <p>Plan Update Confirmation</p>
    </div>
    <div class="body">
      <p>Hi <strong>{{ $userName }}</strong>,</p>
      <p>Your EzyBills subscription for <strong>{{ $businessName }}</strong> has been updated. Here are your new plan details:</p>
      <div class="plan-box">
        <div class="row">
          <div class="label">Plan</div>
          <div class="value">{{ $planName }}</div>
        </div>
        <div class="row">
          <div class="label">Billing Cycle</div>
          <div class="value">{{ ucfirst($billingCycle) }}</div>
        </div>
        <div class="row">
          <div class="label">Valid Until</div>
          <div class="value">{{ $expiryDate }}</div>
        </div>
      </div>
      <p style="font-size:13px;color:#888;">
        If you have any questions about your plan, please contact our support team.
      </p>
    </div>
    <div class="footer">
      <p>&copy; {{ date('Y') }} EzyBills. All rights reserved.</p>
    </div>
  </div>
</body>
</html>

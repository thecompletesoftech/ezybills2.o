<?php

namespace Database\Seeders;

use App\Models\EmailTemplate;
use Illuminate\Database\Seeder;

class EmailTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'key'       => 'verify_email',
                'name'      => 'Email Verification',
                'subject'   => 'Verify Your EzyBills Account',
                'variables' => ['name', 'url'],
                'body_html' => $this->verifyEmailTemplate(),
            ],
            [
                'key'       => 'forgot_password',
                'name'      => 'Forgot Password',
                'subject'   => 'Reset Your EzyBills Password',
                'variables' => ['name', 'url'],
                'body_html' => $this->forgotPasswordTemplate(),
            ],
            [
                'key'       => 'plan_updated',
                'name'      => 'Plan Updated',
                'subject'   => 'Your EzyBills Plan Has Been Updated',
                'variables' => ['name', 'business_name', 'plan_name', 'expiry_date', 'billing_cycle'],
                'body_html' => $this->planUpdatedTemplate(),
            ],
            [
                'key'       => 'promotional',
                'name'      => 'Promotional Email',
                'subject'   => 'Special Offer from EzyBills',
                'variables' => ['name'],
                'body_html' => $this->promotionalTemplate(),
            ],
        ];

        foreach ($templates as $data) {
            EmailTemplate::updateOrCreate(['key' => $data['key']], $data);
        }
    }

    private function verifyEmailTemplate(): string
    {
        return <<<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verify your EzyBills account</title>
  <style>
    body { margin:0; padding:0; background:#f4f7fb; font-family:'Segoe UI',Arial,sans-serif; color:#1a1a2e; }
    .wrapper { max-width:520px; margin:40px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.08); }
    .header { background:#0066CC; padding:32px 40px; text-align:center; }
    .header h1 { margin:0; color:#fff; font-size:24px; font-weight:700; }
    .header p  { margin:4px 0 0; color:#b3d4f5; font-size:13px; }
    .body { padding:36px 40px; }
    .body p  { margin:0 0 16px; font-size:15px; line-height:1.6; color:#444; }
    .btn-wrap { text-align:center; margin:28px 0; }
    .btn { display:inline-block; background:#0066CC; color:#fff; text-decoration:none; padding:14px 36px; border-radius:10px; font-weight:600; font-size:15px; }
    .link-box { background:#f4f7fb; border-radius:8px; padding:12px 16px; font-size:12px; color:#666; word-break:break-all; margin-top:8px; }
    .footer { background:#f9fafb; padding:20px 40px; text-align:center; border-top:1px solid #eee; }
    .footer p { margin:0; font-size:12px; color:#999; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>EzyBills POS</h1><p>Smart Billing for Smart Businesses</p></div>
    <div class="body">
      <p>Hi <strong>{{name}}</strong>,</p>
      <p>Thanks for signing up! Please verify your email address to activate your account.</p>
      <div class="btn-wrap"><a href="{{url}}" class="btn">Verify Email Address</a></div>
      <p style="font-size:13px;color:#888;">If the button doesn't work, copy and paste this link:</p>
      <div class="link-box">{{url}}</div>
      <p style="margin-top:24px;font-size:13px;color:#aaa;">This link expires in <strong>24 hours</strong>. If you didn't create an account, ignore this email.</p>
    </div>
    <div class="footer"><p>&copy; 2025 EzyBills. All rights reserved.</p></div>
  </div>
</body>
</html>
HTML;
    }

    private function forgotPasswordTemplate(): string
    {
        return <<<'HTML'
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
    .header h1 { margin:0; color:#fff; font-size:24px; font-weight:700; }
    .header p  { margin:4px 0 0; color:#b3d4f5; font-size:13px; }
    .body { padding:36px 40px; }
    .body p  { margin:0 0 16px; font-size:15px; line-height:1.6; color:#444; }
    .btn-wrap { text-align:center; margin:28px 0; }
    .btn { display:inline-block; background:#DC2626; color:#fff; text-decoration:none; padding:14px 36px; border-radius:10px; font-weight:600; font-size:15px; }
    .link-box { background:#f4f7fb; border-radius:8px; padding:12px 16px; font-size:12px; color:#666; word-break:break-all; margin-top:8px; }
    .footer { background:#f9fafb; padding:20px 40px; text-align:center; border-top:1px solid #eee; }
    .footer p { margin:0; font-size:12px; color:#999; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>EzyBills POS</h1><p>Password Reset Request</p></div>
    <div class="body">
      <p>Hi <strong>{{name}}</strong>,</p>
      <p>We received a request to reset your password. Click the button below to choose a new password.</p>
      <div class="btn-wrap"><a href="{{url}}" class="btn">Reset Password</a></div>
      <p style="font-size:13px;color:#888;">If the button doesn't work, copy and paste this link:</p>
      <div class="link-box">{{url}}</div>
      <p style="margin-top:24px;font-size:13px;color:#aaa;">This link expires in <strong>60 minutes</strong>. If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
    <div class="footer"><p>&copy; 2025 EzyBills. All rights reserved.</p></div>
  </div>
</body>
</html>
HTML;
    }

    private function planUpdatedTemplate(): string
    {
        return <<<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Plan Updated</title>
  <style>
    body { margin:0; padding:0; background:#f4f7fb; font-family:'Segoe UI',Arial,sans-serif; color:#1a1a2e; }
    .wrapper { max-width:520px; margin:40px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.08); }
    .header { background:#0066CC; padding:32px 40px; text-align:center; }
    .header h1 { margin:0; color:#fff; font-size:24px; font-weight:700; }
    .header p  { margin:4px 0 0; color:#b3d4f5; font-size:13px; }
    .body { padding:36px 40px; }
    .body p  { margin:0 0 16px; font-size:15px; line-height:1.6; color:#444; }
    .plan-box { background:#EFF6FF; border:1px solid #BFDBFE; border-radius:12px; padding:20px 24px; margin:20px 0; }
    .plan-box .label { font-size:12px; color:#6B7280; margin-bottom:2px; }
    .plan-box .value { font-size:15px; font-weight:600; color:#1E40AF; }
    .footer { background:#f9fafb; padding:20px 40px; text-align:center; border-top:1px solid #eee; }
    .footer p { margin:0; font-size:12px; color:#999; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>EzyBills POS</h1><p>Plan Update Confirmation</p></div>
    <div class="body">
      <p>Hi <strong>{{name}}</strong>,</p>
      <p>Your EzyBills subscription for <strong>{{business_name}}</strong> has been updated. Here are your new plan details:</p>
      <div class="plan-box">
        <div style="margin-bottom:12px;"><div class="label">Plan</div><div class="value">{{plan_name}}</div></div>
        <div style="margin-bottom:12px;"><div class="label">Billing Cycle</div><div class="value">{{billing_cycle}}</div></div>
        <div><div class="label">Valid Until</div><div class="value">{{expiry_date}}</div></div>
      </div>
      <p style="font-size:13px;color:#888;">If you have any questions, contact our support team.</p>
    </div>
    <div class="footer"><p>&copy; 2025 EzyBills. All rights reserved.</p></div>
  </div>
</body>
</html>
HTML;
    }

    private function promotionalTemplate(): string
    {
        return <<<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Special Offer from EzyBills</title>
  <style>
    body { margin:0; padding:0; background:#f4f7fb; font-family:'Segoe UI',Arial,sans-serif; color:#1a1a2e; }
    .wrapper { max-width:520px; margin:40px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.08); }
    .header { background:linear-gradient(135deg,#0066CC,#7C3AED); padding:32px 40px; text-align:center; }
    .header h1 { margin:0; color:#fff; font-size:24px; font-weight:700; }
    .header p  { margin:4px 0 0; color:rgba(255,255,255,0.8); font-size:13px; }
    .body { padding:36px 40px; }
    .footer { background:#f9fafb; padding:20px 40px; text-align:center; border-top:1px solid #eee; }
    .footer p { margin:0; font-size:12px; color:#999; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>EzyBills POS</h1><p>Special Offer Just for You</p></div>
    <div class="body">
      <p>Hi <strong>{{name}}</strong>,</p>
      {{body}}
    </div>
    <div class="footer"><p>&copy; 2025 EzyBills. All rights reserved. | <a href="#" style="color:#999;">Unsubscribe</a></p></div>
  </div>
</body>
</html>
HTML;
    }
}

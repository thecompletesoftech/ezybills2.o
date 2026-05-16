<?php

namespace App\Services;

use App\Mail\VerifyEmailMail;
use App\Models\Business;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AuthService
{
    public function register($data)
    {
        $token = Str::random(64);

        $user = User::create([
            'name'                       => $data['name'],
            'email'                      => $data['email'],
            'phone'                      => $data['phone'] ?? null,
            'password'                   => Hash::make($data['password']),
            'role'                       => 'owner',
            'email_verification_token'   => $token,
        ]);

        if (isset($data['business_name'])) {
            $business = Business::create([
                'name'          => $data['business_name'],
                'owner_id'      => $user->id,
                'business_type' => $data['business_type'] ?? 'retail',
            ]);
            $user->update(['business_id' => $business->id]);
        }

        $this->sendVerificationEmail($user);

        return $user;
    }

    public function login($email, $password)
    {
        $user = User::where('email', $email)->first();

        if (!$user || !Hash::check($password, $user->password)) {
            throw new \Exception('Invalid credentials');
        }

        if (!$user->is_active) {
            throw new \Exception('Your account has been deactivated. Please contact support.');
        }

        if ($user->role !== 'super_admin' && is_null($user->email_verified_at)) {
            throw new \Exception('email_not_verified');
        }

        return $user->createToken('auth-token')->plainTextToken;
    }

    public function verifyEmail(string $token): User
    {
        $user = User::where('email_verification_token', $token)->first();

        if (!$user) {
            throw new \Exception('Invalid or expired verification link.');
        }

        $user->update([
            'email_verified_at'          => now(),
            'email_verification_token'   => null,
        ]);

        return $user;
    }

    public function resendVerification(string $email): void
    {
        $user = User::where('email', $email)->first();

        if (!$user) {
            throw new \Exception('No account found with that email address.');
        }

        if (!is_null($user->email_verified_at)) {
            throw new \Exception('This email is already verified.');
        }

        $token = Str::random(64);
        $user->update(['email_verification_token' => $token]);

        $this->sendVerificationEmail($user);
    }

    private function sendVerificationEmail(User $user): void
    {
        $frontendUrl = config('app.frontend_url', 'http://localhost:3000');
        $url = "{$frontendUrl}/email/verify/{$user->email_verification_token}";

        Mail::to($user->email)->send(new VerifyEmailMail($user->name, $url));
    }

    public function sendOtp($phone)
    {
        $user = User::where('phone', $phone)->first();
        if (!$user) {
            throw new \Exception('User not found');
        }

        $otp = rand(100000, 999999);
        $user->update([
            'otp'             => $otp,
            'otp_expires_at'  => now()->addMinutes(10),
        ]);

        // TODO: Send OTP via SMS/WhatsApp
        return true;
    }

    public function verifyOtp($phone, $otp)
    {
        $user = User::where('phone', $phone)->first();
        if (!$user) {
            throw new \Exception('User not found');
        }

        if ($user->otp !== $otp || $user->otp_expires_at < now()) {
            throw new \Exception('Invalid or expired OTP');
        }

        $user->update(['otp' => null, 'otp_expires_at' => null, 'email_verified_at' => now()]);
        return $user->createToken('auth-token')->plainTextToken;
    }

    public function logout($user)
    {
        $user->currentAccessToken()->delete();
        return true;
    }
}

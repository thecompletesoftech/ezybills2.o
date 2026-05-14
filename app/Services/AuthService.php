<?php

namespace App\Services;

use App\Models\User;
use App\Models\Business;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthService
{
    public function register($data)
    {
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => Hash::make($data['password']),
            'role' => 'owner',
        ]);

        if (isset($data['business_name'])) {
            $business = Business::create([
                'name' => $data['business_name'],
                'owner_id' => $user->id,
                'business_type' => $data['business_type'] ?? 'retail',
            ]);
            $user->update(['business_id' => $business->id]);
        }

        return $user;
    }

    public function login($email, $password)
    {
        $user = User::where('email', $email)->first();

        if (!$user || !Hash::check($password, $user->password)) {
            throw new \Exception('Invalid credentials');
        }

        if (!$user->is_active) {
            throw new \Exception('User account is inactive');
        }

        return $user->createToken('auth-token')->plainTextToken;
    }

    public function sendOtp($phone)
    {
        $user = User::where('phone', $phone)->first();
        if (!$user) {
            throw new \Exception('User not found');
        }

        $otp = rand(100000, 999999);
        $user->update([
            'otp' => $otp,
            'otp_expires_at' => now()->addMinutes(10),
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

        $user->update(['otp' => null, 'otp_expires_at' => null]);
        return $user->createToken('auth-token')->plainTextToken;
    }

    public function logout($user)
    {
        $user->currentAccessToken()->delete();
        return true;
    }
}

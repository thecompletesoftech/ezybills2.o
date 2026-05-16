<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Services\AuthService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'phone' => 'required|string|unique:users',
            'password' => 'required|string|min:6|confirmed',
            'business_name' => 'required|string',
            'business_type' => 'required|in:retail,grocery,mobile_shop,electronics,fashion,medical,hardware,cafe,restaurant,food_cart,bakery',
        ]);

        try {
            $user = $this->authService->register($validated);
            return $this->success([
                'user' => $user,
            ], 'Registration successful. Please check your email to verify your account.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 400);
        }
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        try {
            $token = $this->authService->login($validated['email'], $validated['password']);
            $user = User::where('email', $validated['email'])->first();
            return $this->success([
                'user' => $user,
                'token' => $token,
            ], 'Login successful');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 401);
        }
    }

    public function loginWithOtp(Request $request)
    {
        $validated = $request->validate([
            'phone' => 'required|string',
        ]);

        try {
            $this->authService->sendOtp($validated['phone']);
            return $this->success(null, 'OTP sent successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 400);
        }
    }

    public function verifyOtp(Request $request)
    {
        $validated = $request->validate([
            'phone' => 'required|string',
            'otp' => 'required|string',
        ]);

        try {
            $token = $this->authService->verifyOtp($validated['phone'], $validated['otp']);
            $user = User::where('phone', $validated['phone'])->first();
            return $this->success([
                'user' => $user,
                'token' => $token,
            ], 'OTP verified successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 400);
        }
    }

    public function verifyEmail(Request $request, string $token)
    {
        try {
            $user = $this->authService->verifyEmail($token);
            $authToken = $user->createToken('auth-token')->plainTextToken;
            return $this->success([
                'user' => $user,
                'token' => $authToken,
            ], 'Email verified successfully');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 400);
        }
    }

    public function resendVerification(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
        ]);

        try {
            $this->authService->resendVerification($validated['email']);
            return $this->success(null, 'Verification email sent');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 400);
        }
    }

    public function forgotPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email|exists:users',
        ]);

        // TODO: Send reset link via email
        return $this->success(null, 'Password reset link sent');
    }

    public function resetPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:6|confirmed',
        ]);

        // TODO: Verify token and reset password
        return $this->success(null, 'Password reset successfully');
    }

    public function logout(Request $request)
    {
        try {
            $this->authService->logout(auth()->user());
            return $this->success(null, 'Logout successful');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 400);
        }
    }

    public function me(Request $request)
    {
        $user = auth()->user();
        $user->load('business');
        return $this->success($user, 'User data retrieved');
    }
}

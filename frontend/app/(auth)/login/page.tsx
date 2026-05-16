'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const loginSchema = z.object({
  email: z.string().min(1, 'Email or phone is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loadFromStorage } = useAuthStore();
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (isAuthenticated) {
      const { user } = useAuthStore.getState();
      router.replace(user?.role === 'super_admin' ? '/admin' : '/dashboard');
    }
  }, [isAuthenticated, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setUnverifiedEmail('');
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      const { user } = useAuthStore.getState();
      router.replace(user?.role === 'super_admin' ? '/admin' : '/dashboard');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Invalid credentials. Please try again.';
      if (message === 'email_not_verified') {
        setUnverifiedEmail(data.email);
      } else {
        toast.error(message);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0066CC]/10 via-white to-blue-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0066CC] mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">E</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">EzyBills</h1>
          <p className="text-gray-500 mt-1 text-sm">Point of Sale &amp; Billing Management</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Sign in to your account</h2>

          {/* Email not verified banner */}
          {unverifiedEmail && (
            <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <p className="font-medium mb-1">Email not verified</p>
              <p className="text-xs mb-2">Please verify your email before logging in.</p>
              <Link
                href={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
                className="text-xs font-semibold text-amber-900 underline"
              >
                Resend verification email &rarr;
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Email or Phone"
              type="text"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="flex justify-end -mt-2">
              <Link href="/forgot-password" className="text-xs text-[#0066CC] hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              className="w-full mt-1"
            >
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[#0066CC] font-medium hover:underline">
              Create one
            </Link>
          </p>

          <p className="text-center text-xs text-gray-400 mt-3">
            &copy; {new Date().getFullYear()} EzyBills. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

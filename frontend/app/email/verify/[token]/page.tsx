'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import type { User } from '@/lib/types';

type Status = 'verifying' | 'success' | 'error';

export default function EmailVerifyTokenPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { setAuth } = useAuthStore();

  const [status, setStatus] = useState<Status>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) return;

    api
      .get(`/auth/verify-email/${token}`)
      .then((res) => {
        const { token: authToken, user } = res.data as { token: string; user: User };
        if (authToken && user) {
          setAuth(user, authToken);
        }
        setStatus('success');
        setTimeout(() => router.replace('/dashboard'), 2500);
      })
      .catch((err: unknown) => {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'This verification link is invalid or has expired.';
        setErrorMessage(msg);
        setStatus('error');
      });
  }, [token, router, setAuth]);

  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0066CC]/10 via-white to-blue-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-[#0066CC] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600 text-sm">Verifying your email…</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0066CC]/10 via-white to-blue-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h1>
            <p className="text-gray-500 text-sm mb-4">
              Your account is now active. Redirecting you to the dashboard…
            </p>
            <Link
              href="/dashboard"
              className="inline-block bg-[#0066CC] text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-blue-700 transition"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0066CC]/10 via-white to-blue-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
          <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h1>
          <p className="text-gray-500 text-sm mb-6">{errorMessage}</p>
          <Link
            href="/verify-email"
            className="inline-block bg-[#0066CC] text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-blue-700 transition mb-3"
          >
            Resend Verification Email
          </Link>
          <br />
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

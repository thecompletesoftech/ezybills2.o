'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleResend = async () => {
    if (!email || resending || countdown > 0) return;
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email });
      toast.success('Verification email sent!');
      setCountdown(60);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0066CC]/10 via-white to-blue-50 px-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-6">
          <svg className="w-10 h-10 text-[#0066CC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your inbox</h1>
          <p className="text-gray-500 text-sm mb-6">
            We sent a verification link to{' '}
            {email ? <span className="font-semibold text-gray-700">{email}</span> : 'your email address'}.
            Click the link to activate your account.
          </p>

          <div className="bg-blue-50 rounded-xl p-4 text-left mb-6">
            <p className="text-xs text-blue-700 font-medium mb-1">Didn&apos;t receive it?</p>
            <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
              <li>Check your spam or junk folder</li>
              <li>Make sure the email address is correct</li>
              <li>The link expires in 24 hours</li>
            </ul>
          </div>

          <button
            onClick={handleResend}
            disabled={resending || countdown > 0}
            className="w-full py-2.5 rounded-lg border border-[#0066CC] text-[#0066CC] text-sm font-medium hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {resending
              ? 'Sending…'
              : countdown > 0
              ? `Resend in ${countdown}s`
              : 'Resend verification email'}
          </button>

          <Link
            href="/login"
            className="block text-sm text-gray-500 hover:text-gray-700 transition"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}

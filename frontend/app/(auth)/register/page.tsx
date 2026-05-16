'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email'),
    phone: z.string().min(10, 'Enter a valid phone number'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    password_confirmation: z.string(),
    business_name: z.string().min(2, 'Business name is required'),
    business_type: z.enum([
      'retail', 'grocery', 'mobile_shop', 'electronics', 'fashion',
      'medical', 'hardware', 'cafe', 'restaurant', 'food_cart', 'bakery',
    ]),
  })
  .refine((d) => d.password === d.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

const BUSINESS_TYPES = [
  { value: 'retail', label: 'Retail Shop' },
  { value: 'grocery', label: 'Grocery Store' },
  { value: 'mobile_shop', label: 'Mobile Shop' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'fashion', label: 'Fashion / Clothing' },
  { value: 'medical', label: 'Medical / Pharmacy' },
  { value: 'hardware', label: 'Hardware Store' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'food_cart', label: 'Food Cart' },
  { value: 'bakery', label: 'Bakery' },
];

export default function RegisterPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { business_type: 'retail' },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await api.post('/auth/register', data);
      setSubmittedEmail(data.email);
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
      const firstError = resp?.errors ? Object.values(resp.errors)[0]?.[0] : undefined;
      toast.error(firstError || resp?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0066CC]/10 via-white to-blue-50 px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0066CC] mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">E</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">EzyBills</h1>
          <p className="text-gray-500 mt-1 text-sm">Smart Billing for Smart Businesses</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Create your account</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Personal info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Input
                  label="Full Name"
                  type="text"
                  placeholder="Rahul Sharma"
                  error={errors.name?.message}
                  {...register('name')}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="9876543210"
                  error={errors.phone?.message}
                  {...register('phone')}
                />
              </div>
            </div>

            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Input
                  label="Password"
                  type="password"
                  placeholder="Min 6 characters"
                  error={errors.password?.message}
                  {...register('password')}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="Repeat password"
                  error={errors.password_confirmation?.message}
                  {...register('password_confirmation')}
                />
              </div>
            </div>

            {/* Business info */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Business Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Business Name"
                    type="text"
                    placeholder="My Shop"
                    error={errors.business_name?.message}
                    {...register('business_name')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]"
                    {...register('business_type')}
                  >
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  {errors.business_type && (
                    <p className="mt-1 text-xs text-red-500">{errors.business_type.message}</p>
                  )}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              className="w-full mt-2"
            >
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[#0066CC] font-medium hover:underline">
              Sign in
            </Link>
          </p>

          <p className="text-center text-xs text-gray-400 mt-4">
            &copy; {new Date().getFullYear()} EzyBills. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

function setSubmittedEmail(email: string) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem('submittedEmail', email);
  } catch (error) {
    console.warn('Unable to persist submitted email', error);
  }
}


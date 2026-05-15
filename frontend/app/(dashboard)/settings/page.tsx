'use client';

import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import type { Business } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

const businessSchema = z.object({
  name: z.string().min(1, 'Business name is required'),
  business_type: z.string().min(1, 'Business type is required'),
  gst_number: z.string().optional(),
  address: z.string().optional(),
  mobile_number: z.string().optional(),
});

type BusinessFormData = z.infer<typeof businessSchema>;

export default function SettingsPage() {
  const { business } = useAuthStore();

  const { data, isLoading } = useQuery<Business>({
    queryKey: ['business'],
    queryFn: async () => {
      const res = await api.get('/business');
      return res.data;
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BusinessFormData>({
    resolver: zodResolver(businessSchema),
    values: {
      name: data?.name ?? '',
      business_type: data?.business_type ?? '',
      gst_number: data?.gst_number ?? '',
      address: data?.address ?? '',
      mobile_number: data?.mobile_number ?? '',
    },
  });

  const onSubmit = async (formData: BusinessFormData) => {
    try {
      await api.put(`/business/${data?.id ?? business?.id}`, formData);
      toast.success('Business settings updated');
    } catch {
      toast.error('Failed to update settings');
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-500 text-sm mt-0.5">Manage your business information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Profile</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Business Name"
                placeholder="Your Business Name"
                error={errors.name?.message}
                {...register('name')}
              />
              <Input
                label="Business Type"
                placeholder="e.g. Retail, Restaurant"
                error={errors.business_type?.message}
                {...register('business_type')}
              />
              <Input
                label="GST Number"
                placeholder="22AAAAA0000A1Z5"
                error={errors.gst_number?.message}
                {...register('gst_number')}
              />
              <Input
                label="Mobile Number"
                placeholder="+91 98765 43210"
                error={errors.mobile_number?.message}
                {...register('mobile_number')}
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Address</label>
                <textarea
                  placeholder="Business address..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC] resize-none"
                  {...register('address')}
                />
              </div>
              <Button type="submit" variant="primary" loading={isSubmitting}>
                Save Changes
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

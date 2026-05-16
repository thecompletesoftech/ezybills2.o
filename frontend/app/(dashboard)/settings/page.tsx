'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { CheckCircle, AlertTriangle, XCircle, ShieldCheck, ExternalLink, Printer } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import type { Business } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

interface PrinterSettings {
  paper_size: string; connection_type: string; printer_name: string | null;
  bluetooth_address: string | null; network_ip: string | null; network_port: number;
  auto_print: boolean; print_logo: boolean; print_address: boolean; print_mobile: boolean;
  print_gst: boolean; print_footer: boolean; footer_text: string | null; copies: number;
}

function PrinterSettingsCard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<PrinterSettings>({
    queryKey: ['printer-settings'],
    queryFn: () => api.get('/settings/printer').then(r => r.data.data ?? r.data),
  });

  const [form, setForm] = useState<Partial<PrinterSettings>>({});
  const effective = { ...data, ...form } as PrinterSettings;

  const saveMutation = useMutation({
    mutationFn: (s: Partial<PrinterSettings>) => api.post('/settings/printer', s),
    onSuccess: () => { toast.success('Printer settings saved'); qc.invalidateQueries({ queryKey: ['printer-settings'] }); setForm({}); },
    onError: () => toast.error('Failed to save printer settings'),
  });

  const testPrint = () => {
    toast.success('Test print sent! Check your printer.');
    // In a real implementation, this would trigger the browser print dialog or send to printer
    window.print();
  };

  const set = <K extends keyof PrinterSettings>(k: K, v: PrinterSettings[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer size={18} className="text-gray-600" /> Printer Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Paper size */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Paper Size</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: '58mm', label: '58mm', sub: '2 inch' },
              { value: '80mm', label: '80mm', sub: '3 inch' },
              { value: 'A4', label: 'A4', sub: 'Full page' },
            ].map(opt => (
              <button
                key={opt.value} type="button"
                onClick={() => set('paper_size', opt.value)}
                className={`p-3 rounded-lg border-2 text-center transition-colors ${effective.paper_size === opt.value ? 'border-[#0066CC] bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
              >
                <p className={`font-semibold text-sm ${effective.paper_size === opt.value ? 'text-[#0066CC]' : 'text-gray-700'}`}>{opt.label}</p>
                <p className="text-xs text-gray-400">{opt.sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Connection type */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Connection Type</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'usb', label: 'USB', sub: 'Windows/Mac' },
              { value: 'bluetooth', label: 'Bluetooth', sub: 'Mobile app' },
              { value: 'network', label: 'Network', sub: 'LAN / WiFi' },
            ].map(opt => (
              <button
                key={opt.value} type="button"
                onClick={() => set('connection_type', opt.value)}
                className={`p-3 rounded-lg border-2 text-center transition-colors ${effective.connection_type === opt.value ? 'border-[#0066CC] bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
              >
                <p className={`font-semibold text-sm ${effective.connection_type === opt.value ? 'text-[#0066CC]' : 'text-gray-700'}`}>{opt.label}</p>
                <p className="text-xs text-gray-400">{opt.sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Conditional fields */}
        {effective.connection_type === 'usb' && (
          <Input label="Printer Name (optional)" placeholder="e.g. EPSON TM-T82"
            value={effective.printer_name ?? ''} onChange={e => set('printer_name', e.target.value || null)} />
        )}
        {effective.connection_type === 'bluetooth' && (
          <Input label="Bluetooth MAC Address" placeholder="e.g. 00:11:22:33:44:55"
            value={effective.bluetooth_address ?? ''} onChange={e => set('bluetooth_address', e.target.value || null)} />
        )}
        {effective.connection_type === 'network' && (
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input label="Printer IP Address" placeholder="e.g. 192.168.1.100"
                value={effective.network_ip ?? ''} onChange={e => set('network_ip', e.target.value || null)} />
            </div>
            <Input label="Port" type="number" placeholder="9100"
              value={String(effective.network_port ?? 9100)} onChange={e => set('network_port', parseInt(e.target.value) || 9100)} />
          </div>
        )}

        {/* Bill options */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Bill Options</p>
          <div className="space-y-2">
            {([
              { key: 'auto_print', label: 'Auto-print on invoice save' },
              { key: 'print_logo', label: 'Print business logo' },
              { key: 'print_address', label: 'Print business address' },
              { key: 'print_mobile', label: 'Print mobile number' },
              { key: 'print_gst', label: 'Print GST breakdown' },
              { key: 'print_footer', label: 'Print footer message' },
            ] as { key: keyof PrinterSettings; label: string }[]).map(opt => (
              <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!effective[opt.key]}
                  onChange={e => set(opt.key, e.target.checked as PrinterSettings[typeof opt.key])}
                  className="rounded" />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {effective.print_footer && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Footer Text</label>
            <textarea rows={2} placeholder="Thank you for your business!"
              value={effective.footer_text ?? ''}
              onChange={e => set('footer_text', e.target.value || null)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC] resize-none" />
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Number of Copies</label>
          <select value={effective.copies ?? 1} onChange={e => set('copies', parseInt(e.target.value))}
            className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]">
            {[1, 2, 3].map(n => <option key={n} value={n}>{n} cop{n === 1 ? 'y' : 'ies'}</option>)}
          </select>
        </div>

        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <Button variant="outline" onClick={testPrint}>Test Print</Button>
          <Button variant="primary" loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate(form)}>
            Save Printer Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface MyPlan {
  plan: { id: number; name: string; price: number; billing_cycle: string; features: string[] } | null;
  subscription: { start_date: string; end_date: string; status: string } | null;
  expires_at: string | null;
  days_left: number;
  is_active: boolean;
  is_trial: boolean;
}

const businessSchema = z.object({
  name: z.string().min(1, 'Business name is required'),
  business_type: z.string().min(1, 'Business type is required'),
  gst_number: z.string().optional(),
  address: z.string().optional(),
  mobile_number: z.string().optional(),
});

type BusinessFormData = z.infer<typeof businessSchema>;

export default function SettingsPage() {
  const { business, user } = useAuthStore();

  const { data: myPlan, isLoading: planLoading } = useQuery<MyPlan>({
    queryKey: ['my-plan'],
    queryFn: async () => {
      const res = await api.get('/my-plan');
      return res.data;
    },
  });

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

  const planStatusIcon = () => {
    if (!myPlan) return null;
    if (myPlan.is_trial) return <AlertTriangle size={16} className="text-amber-500" />;
    if (!myPlan.is_active) return <XCircle size={16} className="text-red-500" />;
    if (myPlan.days_left <= 7) return <AlertTriangle size={16} className="text-amber-500" />;
    return <CheckCircle size={16} className="text-green-500" />;
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-500 text-sm mt-0.5">Manage your business information</p>
      </div>

      {/* My Plan card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-purple-600" /> My Subscription Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {planLoading ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : myPlan?.is_trial || !myPlan?.plan ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">No active plan</p>
                <p className="text-xs text-amber-600 mt-1">Contact your administrator to assign a subscription plan.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {planStatusIcon()}
                  <span className="font-semibold text-gray-900 text-base">{myPlan.plan.name}</span>
                </div>
                <Badge variant={myPlan.is_active && myPlan.days_left > 7 ? 'green' : myPlan.days_left > 0 ? 'yellow' : 'red'}>
                  {!myPlan.is_active ? 'Expired' : myPlan.days_left <= 7 ? `${myPlan.days_left} days left` : 'Active'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Plan Price</p>
                  <p className="font-semibold text-gray-800">
                    ₹{myPlan.plan.price}/{myPlan.plan.billing_cycle === 'monthly' ? 'mo' : myPlan.plan.billing_cycle === 'yearly' ? 'yr' : 'qtr'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Expires On</p>
                  <p className="font-semibold text-gray-800">
                    {myPlan.expires_at ? format(parseISO(myPlan.expires_at), 'dd MMM yyyy') : '—'}
                  </p>
                </div>
              </div>

              {myPlan.plan.features && myPlan.plan.features.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Included features</p>
                  <ul className="grid grid-cols-2 gap-1">
                    {myPlan.plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <CheckCircle size={11} className="text-green-500 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {myPlan.days_left <= 7 && myPlan.days_left > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                  Your plan expires in <strong>{myPlan.days_left} day(s)</strong>. Contact your administrator to renew.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {user?.role === 'super_admin' && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-purple-600" />
            <div>
              <p className="text-sm font-semibold text-purple-800">Super Admin Access</p>
              <p className="text-xs text-purple-600">Manage all businesses, plans, and subscriptions</p>
            </div>
          </div>
          <Link href="/admin">
            <Button variant="outline" size="sm" className="border-purple-300 text-purple-700 hover:bg-purple-100">
              Admin Panel <ExternalLink size={13} className="ml-1" />
            </Button>
          </Link>
        </div>
      )}

      <PrinterSettingsCard />

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

'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Send, Users, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const TARGETS = [
  { value: 'all',     label: 'All Registered Users',  desc: 'Every verified business owner' },
  { value: 'active',  label: 'Active Subscribers',     desc: 'Businesses with a valid subscription' },
  { value: 'expired', label: 'Expired Subscriptions',  desc: 'Businesses whose plan has expired' },
  { value: 'trial',   label: 'Trial / Free Users',     desc: 'Businesses with no subscription yet' },
];

export default function PromotionalEmailPage() {
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [target, setTarget] = useState('all');
  const [sent, setSent] = useState<{ queued: number } | null>(null);

  const sendMutation = useMutation({
    mutationFn: () =>
      api.post('/admin/email/send-promotional', { subject, body_html: bodyHtml, target }).then(r => r.data),
    onSuccess: (data: { queued: number }) => {
      setSent(data);
      toast.success(`Queued for ${data.queued} recipients`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to queue campaign');
    },
  });

  if (sent) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Email Queued!</h2>
            <p className="text-gray-500 mb-6">
              Your campaign has been queued for <strong>{sent.queued}</strong> recipient(s) and will be delivered shortly.
            </p>
            <Button variant="outline" onClick={() => { setSent(null); setSubject(''); setBodyHtml(''); }}>
              Send Another Campaign
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Send Promotional Email</h1>
        <p className="text-sm text-gray-500 mt-1">Compose and send a custom email campaign to your users.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" /> Target Audience
              </p>
              <div className="space-y-2">
                {TARGETS.map((t) => (
                  <label
                    key={t.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      target === t.value ? 'border-[#0066CC] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="target"
                      value={t.value}
                      checked={target === t.value}
                      onChange={() => setTarget(t.value)}
                      className="mt-0.5 shrink-0"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{t.label}</p>
                      <p className="text-xs text-gray-500">{t.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tips</p>
              <ul className="text-xs text-gray-500 space-y-1.5 list-disc list-inside">
                <li>Use <code className="bg-gray-100 px-1 rounded">{'{{name}}'}</code> for recipient&apos;s name</li>
                <li>HTML is fully supported in the body</li>
                <li>Emails are queued and sent in background</li>
                <li>Edit the promotional template in Email Templates</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Compose */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-5 space-y-4">
              <Input
                label="Subject Line"
                placeholder="e.g. Special Offer — 30% off EzyBills Pro!"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Body <span className="text-gray-400 font-normal">(HTML supported)</span>
                </label>
                <textarea
                  className="w-full h-64 border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC] resize-y"
                  placeholder={'<p>We have an exciting offer for you...</p>\n<p><a href="https://ezybills.com">Upgrade now →</a></p>'}
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                />
              </div>

              {bodyHtml && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Live Preview</p>
                  <div
                    className="border border-gray-200 rounded-lg p-4 text-sm bg-white"
                    dangerouslySetInnerHTML={{ __html: bodyHtml }}
                  />
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-gray-100">
                <Button
                  variant="primary"
                  loading={sendMutation.isPending}
                  disabled={!subject.trim() || !bodyHtml.trim()}
                  onClick={() => sendMutation.mutate()}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Campaign
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

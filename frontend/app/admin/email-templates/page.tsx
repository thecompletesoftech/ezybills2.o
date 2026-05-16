'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, Pencil, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

interface EmailTemplate {
  id: number;
  key: string;
  name: string;
  subject: string;
  body_html: string;
  variables: string[] | null;
  is_active: boolean;
}

const VARIABLE_LABELS: Record<string, string> = {
  name: 'Recipient Name',
  url: 'Action URL',
  business_name: 'Business Name',
  plan_name: 'Plan Name',
  expiry_date: 'Expiry Date',
  billing_cycle: 'Billing Cycle',
  body: 'Email Body',
};

export default function EmailTemplatesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [previewing, setPreviewing] = useState<{ subject: string; body_html: string } | null>(null);

  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ['admin', 'email-templates'],
    queryFn: () => api.get('/admin/email-templates').then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; subject: string; body_html: string; is_active: boolean }) =>
      api.put(`/admin/email-templates/${data.id}`, data),
    onSuccess: () => {
      toast.success('Template saved');
      qc.invalidateQueries({ queryKey: ['admin', 'email-templates'] });
      setEditing(null);
    },
    onError: () => toast.error('Failed to save template'),
  });

  const previewMutation = useMutation({
    mutationFn: (id: number) =>
      api.get(`/admin/email-templates/${id}/preview`).then(r => r.data),
    onSuccess: (data: { subject: string; body_html: string }) => setPreviewing(data),
  });

  if (isLoading) return <div className="flex justify-center p-12"><Spinner /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
        <p className="text-sm text-gray-500 mt-1">Edit subject lines and HTML body for every system email.</p>
      </div>

      <div className="grid gap-4">
        {templates.map((t) => (
          <Card key={t.id} className="border border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-[#0066CC]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{t.name}</p>
                      <Badge variant={t.is_active ? 'green' : 'gray'}>
                        {t.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">{t.key}</p>
                    <p className="text-sm text-gray-600 mt-1 truncate">Subject: {t.subject}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    loading={previewMutation.isPending && previewMutation.variables === t.id}
                    onClick={() => previewMutation.mutate(t.id)}
                  >
                    <Eye className="w-4 h-4 mr-1" /> Preview
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                    <Pencil className="w-4 h-4 mr-1" /> Edit
                  </Button>
                </div>
              </div>

              {t.variables && t.variables.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-gray-400">Variables:</span>
                  {t.variables.map((v) => (
                    <span key={v} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit — ${editing?.name ?? ''}`} className="max-w-3xl">
        {editing && (
          <EditForm
            template={editing}
            onSave={(data) => updateMutation.mutate({ id: editing.id, ...data })}
            saving={updateMutation.isPending}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      {/* Preview Modal */}
      <Modal open={!!previewing} onClose={() => setPreviewing(null)} title="Email Preview" className="max-w-2xl">
        {previewing && (
          <div>
            <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-xs text-gray-500">Subject: </span>
              <span className="text-sm font-medium">{previewing.subject}</span>
            </div>
            <div
              className="border border-gray-200 rounded-lg overflow-hidden"
              dangerouslySetInnerHTML={{ __html: previewing.body_html }}
            />
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setPreviewing(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function EditForm({
  template, onSave, saving, onCancel,
}: {
  template: EmailTemplate;
  onSave: (d: { subject: string; body_html: string; is_active: boolean }) => void;
  saving: boolean;
  onCancel: () => void;
}) {
  const [subject, setSubject] = useState(template.subject);
  const [bodyHtml, setBodyHtml] = useState(template.body_html);
  const [isActive, setIsActive] = useState(template.is_active);

  return (
    <div className="space-y-4">
      <Input label="Subject Line" value={subject} onChange={(e) => setSubject(e.target.value)} />

      {template.variables && template.variables.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-800 mb-2">Available variables — click to copy:</p>
          <div className="flex flex-wrap gap-2">
            {template.variables.map((v) => (
              <button
                key={v}
                type="button"
                className="text-xs bg-white border border-amber-300 text-amber-700 px-2 py-0.5 rounded font-mono hover:bg-amber-100 transition"
                onClick={() => navigator.clipboard.writeText(`{{${v}}}`).then(() => toast.success(`Copied {{${v}}}`))}
              >
                {`{{${v}}}`} — {VARIABLE_LABELS[v] ?? v}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">HTML Body</label>
        <textarea
          className="w-full h-80 font-mono text-xs border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC] resize-y"
          value={bodyHtml}
          onChange={(e) => setBodyHtml(e.target.value)}
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
        <span className="text-sm text-gray-700">Template is active</span>
      </label>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" loading={saving} onClick={() => onSave({ subject, body_html: bodyHtml, is_active: isActive })}>
          Save Template
        </Button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

interface Plan {
  id: number;
  name: string;
  type: string;
  price: number;
  currency: string;
  billing_cycle: string;
  device_limit: number | null;
  user_limit: number | null;
  whatsapp_message_limit: number | null;
  branch_limit: number | null;
  features: string[];
  is_active: boolean;
  subscriptions_count?: number;
}

interface PlanForm {
  name: string;
  type: string;
  price: string;
  billing_cycle: string;
  device_limit: string;
  user_limit: string;
  whatsapp_message_limit: string;
  features: string;
  is_active: boolean;
}

const emptyForm: PlanForm = {
  name: '', type: 'standard', price: '', billing_cycle: 'monthly',
  device_limit: '', user_limit: '', whatsapp_message_limit: '', features: '', is_active: true,
};

function planToForm(p: Plan): PlanForm {
  return {
    name: p.name, type: p.type, price: String(p.price), billing_cycle: p.billing_cycle,
    device_limit: p.device_limit !== null ? String(p.device_limit) : '',
    user_limit: p.user_limit !== null ? String(p.user_limit) : '',
    whatsapp_message_limit: p.whatsapp_message_limit !== null ? String(p.whatsapp_message_limit) : '',
    features: (p.features ?? []).join('\n'),
    is_active: p.is_active,
  };
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function PlansPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm);

  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      const res = await api.get('/admin/plans');
      return res.data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        type: form.type,
        price: parseFloat(form.price),
        billing_cycle: form.billing_cycle,
        device_limit: form.device_limit ? parseInt(form.device_limit) : null,
        user_limit: form.user_limit ? parseInt(form.user_limit) : null,
        whatsapp_message_limit: form.whatsapp_message_limit ? parseInt(form.whatsapp_message_limit) : null,
        features: form.features.split('\n').map(f => f.trim()).filter(Boolean),
        is_active: form.is_active,
      };
      return editing
        ? api.put(`/admin/plans/${editing.id}`, payload)
        : api.post('/admin/plans', payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Plan updated' : 'Plan created');
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      closeModal();
    },
    onError: () => toast.error('Failed to save plan'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/plans/${id}`),
    onSuccess: () => {
      toast.success('Plan deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
    },
    onError: () => toast.error('Cannot delete — plan has active subscribers'),
  });

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (p: Plan) => { setEditing(p); setForm(planToForm(p)); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); setForm(emptyForm); };

  const f = (key: keyof PlanForm) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value })),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Plans</h2>
          <p className="text-gray-500 text-sm mt-0.5">Manage subscription plans</p>
        </div>
        <Button variant="primary" onClick={openAdd}><Plus size={16} /> Create Plan</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-gray-400">
            <p className="text-sm">No plans yet. Create your first plan.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <Card key={plan.id} className={!plan.is_active ? 'opacity-60' : ''}>
              <CardContent className="pt-5 pb-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{plan.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{plan.type} · {plan.billing_cycle}</p>
                  </div>
                  <Badge variant={plan.is_active ? 'green' : 'gray'}>{plan.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>

                <p className="text-3xl font-bold text-[#6B21A8]">
                  {formatCurrency(plan.price)}
                  <span className="text-sm font-normal text-gray-400">
                    /{plan.billing_cycle === 'monthly' ? 'mo' : plan.billing_cycle === 'yearly' ? 'yr' : 'qtr'}
                  </span>
                </p>

                <div className="text-xs text-gray-500 space-y-1">
                  {plan.device_limit && <p>📱 {plan.device_limit} device{plan.device_limit > 1 ? 's' : ''}</p>}
                  {plan.user_limit && <p>👥 {plan.user_limit} user{plan.user_limit > 1 ? 's' : ''}</p>}
                  {plan.whatsapp_message_limit && <p>💬 {plan.whatsapp_message_limit} WhatsApp msgs/mo</p>}
                </div>

                {plan.features && plan.features.length > 0 && (
                  <ul className="space-y-1">
                    {plan.features.slice(0, 4).map((f, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Check size={12} className="text-green-500 flex-shrink-0" /> {f}
                      </li>
                    ))}
                    {plan.features.length > 4 && (
                      <li className="text-xs text-gray-400">+{plan.features.length - 4} more</li>
                    )}
                  </ul>
                )}

                {(plan.subscriptions_count ?? 0) > 0 && (
                  <p className="text-xs text-blue-600 font-medium">{plan.subscriptions_count} active subscriber(s)</p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(plan)}>
                    <Pencil size={13} /> Edit
                  </Button>
                  <button
                    onClick={() => { if (confirm('Delete this plan?')) deleteMutation.mutate(plan.id); }}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Plan' : 'Create Plan'} className="max-w-lg">
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Plan Name *" placeholder="e.g. Starter, Pro, Enterprise" {...f('name')} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Type</label>
              <select value={form.type} onChange={(e) => setForm(p => ({ ...p, type: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500">
                <option value="trial">Trial</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Billing Cycle</label>
              <select value={form.billing_cycle} onChange={(e) => setForm(p => ({ ...p, billing_cycle: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <Input label="Price (₹) *" type="number" min="0" step="1" placeholder="999" {...f('price')} />
            </div>
            <div>
              <Input label="Device Limit" type="number" min="1" placeholder="Unlimited" {...f('device_limit')} />
            </div>
            <div>
              <Input label="User Limit" type="number" min="1" placeholder="Unlimited" {...f('user_limit')} />
            </div>
            <div>
              <Input label="WhatsApp Msgs/mo" type="number" min="0" placeholder="0" {...f('whatsapp_message_limit')} />
            </div>

            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Features (one per line)</label>
              <textarea
                value={form.features}
                onChange={(e) => setForm(p => ({ ...p, features: e.target.value }))}
                rows={4}
                placeholder={'Unlimited Products\nBilling & Invoicing\nGST Reports\nWhatsApp Integration'}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 resize-none"
              />
            </div>

            <div className="col-span-2 flex items-center gap-3">
              <input type="checkbox" id="is_active" checked={form.is_active}
                onChange={(e) => setForm(p => ({ ...p, is_active: e.target.checked }))}
                className="w-4 h-4 rounded text-purple-600" />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Plan is active (visible to users)</label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1 bg-purple-700 hover:bg-purple-800" loading={saveMutation.isPending}>
              {editing ? 'Update Plan' : 'Create Plan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

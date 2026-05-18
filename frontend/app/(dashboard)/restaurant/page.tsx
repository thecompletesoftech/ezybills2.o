'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, UtensilsCrossed, Hash } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import PrintKotSlip, { type KotSlipData } from '@/components/print-kot';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';

const RESTAURANT_TYPES = ['restaurant', 'cafe', 'food_cart', 'bakery'];

// ─── types ───────────────────────────────────────────────────────────────────

interface RestaurantTable {
  id: number;
  table_number: string;
  seats: number;
  status: 'empty' | 'occupied' | 'reserved' | 'dirty';
  is_active: boolean;
  pending_kots_count?: number;
}

interface KotItem { name: string; qty: number; notes?: string }

interface Kot {
  id: number;
  kot_number: string;
  table_id: number | null;
  table?: RestaurantTable;
  kot_time: string;
  items: KotItem[];
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
}

interface Token {
  id: number;
  token_number: string;
  token_time: string;
  items: KotItem[];
  status: 'pending' | 'ready' | 'served' | 'cancelled';
  token_amount: number | null;
  notes: string | null;
}

type ActiveTab = 'tables' | 'kots' | 'tokens';

// ─── helpers ─────────────────────────────────────────────────────────────────

const TABLE_STATUS_COLORS: Record<string, string> = {
  empty: 'border-green-400 bg-green-50',
  occupied: 'border-red-400 bg-red-50',
  reserved: 'border-orange-400 bg-orange-50',
  dirty: 'border-purple-400 bg-purple-50',
};

const KOT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-700 border-orange-300',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-300',
  completed: 'bg-green-100 text-green-700 border-green-300',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-300',
};

const TOKEN_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-700',
  ready: 'bg-green-100 text-green-700',
  served: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-600',
};

function safeTime(s: string) {
  try { return format(parseISO(s), 'hh:mm a'); } catch { return s; }
}

// ─── new-item row helper ──────────────────────────────────────────────────────

interface ItemRow { name: string; qty: string; notes: string }
const emptyRow = (): ItemRow => ({ name: '', qty: '1', notes: '' });

function ItemRows({ rows, onChange }: { rows: ItemRow[]; onChange: (r: ItemRow[]) => void }) {
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex gap-2 items-start">
          <input value={r.name} placeholder="Item name" onChange={(e) => onChange(rows.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]" />
          <input type="number" min="0.5" step="0.5" value={r.qty} onChange={(e) => onChange(rows.map((x, j) => j === i ? { ...x, qty: e.target.value } : x))}
            className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]" />
          {rows.length > 1 && (
            <button onClick={() => onChange(rows.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-lg leading-none mt-1">×</button>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...rows, emptyRow()])}>+ Add Item</Button>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function RestaurantPage() {
  const qc = useQueryClient();
  const { business } = useAuthStore();
  const kotEnabled =
    business?.settings?.enable_restaurant_features ??
    RESTAURANT_TYPES.includes(business?.business_type ?? '');

  const [tab, setTab] = useState<ActiveTab>('tables');

  // tables
  const [addTableOpen, setAddTableOpen] = useState(false);
  const [tableNum, setTableNum] = useState('');
  const [tableSeats, setTableSeats] = useState('4');

  // kots
  const [addKotOpen, setAddKotOpen]   = useState(false);
  const [kotTableId, setKotTableId]   = useState('');
  const [kotItems, setKotItems]       = useState<ItemRow[]>([emptyRow()]);
  const [kotNotes, setKotNotes]       = useState('');
  const [kotFilter, setKotFilter]     = useState<string>('');
  const [kotToPrint, setKotToPrint]   = useState<KotSlipData | null>(null);

  // tokens
  const [addTokenOpen, setAddTokenOpen] = useState(false);
  const [tokenItems, setTokenItems]     = useState<ItemRow[]>([emptyRow()]);
  const [tokenNotes, setTokenNotes]     = useState('');
  const [tokenFilter, setTokenFilter]   = useState<string>('');

  // ── queries ──────────────────────────────────────────────────────────────
  const { data: tables = [], isLoading: tablesLoading } = useQuery<RestaurantTable[]>({
    queryKey: ['tables'],
    queryFn: async () => (await api.get('/tables')).data?.data ?? [],
    enabled: kotEnabled && tab === 'tables',
  });

  const { data: kots = [], isLoading: kotsLoading } = useQuery<Kot[]>({
    queryKey: ['kots', kotFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (kotFilter) params.status = kotFilter;
      return (await api.get('/kot', { params })).data?.data ?? [];
    },
    enabled: kotEnabled && tab === 'kots',
  });

  const { data: tokens = [], isLoading: tokensLoading } = useQuery<Token[]>({
    queryKey: ['tokens', tokenFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (tokenFilter) params.status = tokenFilter;
      return (await api.get('/tokens', { params })).data?.data ?? [];
    },
    enabled: kotEnabled && tab === 'tokens',
  });

  // ── mutations ─────────────────────────────────────────────────────────────
  const addTableMutation = useMutation({
    mutationFn: () => api.post('/tables', { table_number: tableNum, seats: parseInt(tableSeats) }),
    onSuccess: () => { toast.success('Table added'); qc.invalidateQueries({ queryKey: ['tables'] }); setAddTableOpen(false); setTableNum(''); setTableSeats('4'); },
    onError: () => toast.error('Failed to add table'),
  });

  const updateTableStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.put(`/tables/${id}`, { status }),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['tables'] }); },
  });

  const deleteTable = useMutation({
    mutationFn: (id: number) => api.delete(`/tables/${id}`),
    onSuccess: () => { toast.success('Table deleted'); qc.invalidateQueries({ queryKey: ['tables'] }); },
  });

  const addKotMutation = useMutation({
    mutationFn: () => api.post('/kot', {
      table_id: kotTableId ? parseInt(kotTableId) : null,
      items: kotItems.map((r) => ({ name: r.name, qty: parseFloat(r.qty), notes: r.notes || undefined })),
      notes: kotNotes || null,
    }),
    onSuccess: (res) => {
      toast.success('KOT sent to kitchen');
      qc.invalidateQueries({ queryKey: ['kots'] });
      setAddKotOpen(false);
      // auto-print KOT slip
      const kot = res.data?.data ?? res.data;
      const matchedTable = tables.find((t) => t.id === (kotTableId ? parseInt(kotTableId) : -1));
      setKotToPrint({
        kot_number: kot.kot_number ?? `KOT-${Date.now()}`,
        table_number: matchedTable?.table_number ?? null,
        kot_time: kot.kot_time ?? new Date().toISOString(),
        items: kotItems.map((r) => ({ name: r.name, qty: parseFloat(r.qty), notes: r.notes || undefined })),
        notes: kotNotes || null,
        business_name: business?.name ?? 'Kitchen',
      });
      setKotItems([emptyRow()]); setKotNotes(''); setKotTableId('');
    },
    onError: () => toast.error('Failed to create KOT'),
  });

  const updateKotStatus = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'complete' | 'cancel' | 'in_progress' }) => {
      if (action === 'complete') return api.post(`/kot/${id}/complete`);
      if (action === 'cancel') return api.post(`/kot/${id}/cancel`);
      return api.put(`/kot/${id}`, { status: 'in_progress' });
    },
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['kots'] }); qc.invalidateQueries({ queryKey: ['tables'] }); },
  });

  const addTokenMutation = useMutation({
    mutationFn: () => api.post('/tokens', {
      items: tokenItems.map((r) => ({ name: r.name, qty: parseFloat(r.qty) })),
      notes: tokenNotes || null,
    }),
    onSuccess: () => { toast.success('Token issued'); qc.invalidateQueries({ queryKey: ['tokens'] }); setAddTokenOpen(false); setTokenItems([emptyRow()]); setTokenNotes(''); },
    onError: () => toast.error('Failed to issue token'),
  });

  const updateTokenStatus = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'ready' | 'served' | 'cancel' }) => {
      if (action === 'ready') return api.post(`/tokens/${id}/ready`);
      if (action === 'cancel') return api.delete(`/tokens/${id}`);
      return api.put(`/tokens/${id}`, { status: 'served' });
    },
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['tokens'] }); },
  });

  // ── render ────────────────────────────────────────────────────────────────
  if (!kotEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <UtensilsCrossed size={48} className="text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-700 mb-1">Restaurant / KOT not enabled</h2>
        <p className="text-sm text-gray-400">This feature is not enabled for your business.<br />Contact your admin to enable it.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Restaurant / KOT</h2>
          <p className="text-gray-500 text-sm mt-0.5">Table management, kitchen orders, and token queue</p>
        </div>
        <Button size="sm" onClick={() => qc.invalidateQueries()}>
          <RefreshCw size={14} className="mr-1" /> Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([['tables', 'Tables'], ['kots', 'Kitchen Orders (KOT)'], ['tokens', 'Token Queue']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-[#0066CC] text-[#0066CC]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TABLES ──────────────────────────────────────────────────────── */}
      {tab === 'tables' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary" size="md" onClick={() => setAddTableOpen(true)}><Plus size={15} className="mr-1" /> Add Table</Button>
          </div>
          {tablesLoading ? <div className="flex justify-center py-14"><Spinner /></div>
            : tables.length === 0 ? (
              <div className="flex flex-col items-center py-14 text-gray-400">
                <UtensilsCrossed size={40} className="mb-3 opacity-40" />
                <p className="text-sm">No tables added. Start by adding a table.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {tables.map((t) => (
                  <div key={t.id} className={`relative border-2 rounded-xl p-4 flex flex-col items-center gap-1 cursor-default ${TABLE_STATUS_COLORS[t.status] ?? 'border-gray-300 bg-gray-50'}`}>
                    <UtensilsCrossed size={28} className="text-gray-500" />
                    <p className="font-bold text-gray-800 text-base">{t.table_number}</p>
                    <p className="text-xs text-gray-500">{t.seats} seats</p>
                    {(t.pending_kots_count ?? 0) > 0 && (
                      <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{t.pending_kots_count}</span>
                    )}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      t.status === 'empty' ? 'bg-green-100 text-green-700'
                      : t.status === 'occupied' ? 'bg-red-100 text-red-700'
                      : t.status === 'dirty' ? 'bg-purple-100 text-purple-700'
                      : 'bg-orange-100 text-orange-700'}`}>
                      {t.status}
                    </span>
                    <div className="flex gap-1 mt-1 flex-wrap justify-center">
                      {t.status !== 'empty' && (
                        <button onClick={() => updateTableStatus.mutate({ id: t.id, status: 'empty' })}
                          className="text-[10px] border border-gray-300 rounded px-1.5 py-0.5 text-gray-600 hover:bg-white">Empty</button>
                      )}
                      {t.status !== 'dirty' && (
                        <button onClick={() => updateTableStatus.mutate({ id: t.id, status: 'dirty' })}
                          className="text-[10px] border border-gray-300 rounded px-1.5 py-0.5 text-gray-600 hover:bg-white">Dirty</button>
                      )}
                      <button onClick={() => { if (confirm(`Delete table ${t.table_number}?`)) deleteTable.mutate(t.id); }}
                        className="text-[10px] border border-red-200 rounded px-1.5 py-0.5 text-red-500 hover:bg-red-50">Del</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      )}

      {/* ── KOTS ────────────────────────────────────────────────────────── */}
      {tab === 'kots' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1 flex-wrap">
              {[['', 'All'], ['pending', 'Pending'], ['in_progress', 'In Progress'], ['completed', 'Completed']].map(([val, label]) => (
                <button key={val} onClick={() => setKotFilter(val)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${kotFilter === val ? 'bg-[#0066CC] text-white border-[#0066CC]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0066CC]'}`}>
                  {label}
                </button>
              ))}
            </div>
            <Button variant="primary" size="md" onClick={() => setAddKotOpen(true)}><Plus size={15} className="mr-1" /> New KOT</Button>
          </div>

          {kotsLoading ? <div className="flex justify-center py-14"><Spinner /></div>
            : kots.length === 0 ? <p className="text-center text-gray-400 py-14 text-sm">No kitchen orders found.</p>
            : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {kots.map((kot) => (
                  <Card key={kot.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-gray-800">{kot.kot_number}</p>
                          {kot.table && <p className="text-xs text-gray-500">Table: {kot.table.table_number}</p>}
                          <p className="text-xs text-gray-400">{safeTime(kot.kot_time)}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${KOT_STATUS_COLORS[kot.status] ?? ''}`}>
                          {kot.status.replace('_', ' ')}
                        </span>
                      </div>
                      <ul className="text-sm space-y-0.5 mb-3">
                        {kot.items.map((item, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="font-bold text-orange-600">{item.qty}×</span>
                            <span className="text-gray-700">{item.name}</span>
                          </li>
                        ))}
                      </ul>
                      {kot.notes && <p className="text-xs text-gray-400 italic mb-2">{kot.notes}</p>}
                      {(kot.status === 'pending' || kot.status === 'in_progress') && (
                        <div className="flex gap-2">
                          {kot.status === 'pending' && (
                            <Button variant="outline" size="sm" className="flex-1"
                              onClick={() => updateKotStatus.mutate({ id: kot.id, action: 'in_progress' })}>Start</Button>
                          )}
                          <Button variant="primary" size="sm" className="flex-1"
                            onClick={() => updateKotStatus.mutate({ id: kot.id, action: 'complete' })}>Complete</Button>
                          <Button variant="outline" size="sm"
                            onClick={() => { if (confirm('Cancel this KOT?')) updateKotStatus.mutate({ id: kot.id, action: 'cancel' }); }}
                            className="text-red-500 hover:text-red-700">×</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
        </div>
      )}

      {/* ── TOKENS ──────────────────────────────────────────────────────── */}
      {tab === 'tokens' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1 flex-wrap">
              {[['', 'All'], ['pending', 'Pending'], ['ready', 'Ready'], ['served', 'Served']].map(([val, label]) => (
                <button key={val} onClick={() => setTokenFilter(val)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${tokenFilter === val ? 'bg-[#0066CC] text-white border-[#0066CC]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0066CC]'}`}>
                  {label}
                </button>
              ))}
            </div>
            <Button variant="primary" size="md" onClick={() => setAddTokenOpen(true)}><Plus size={15} className="mr-1" /> Issue Token</Button>
          </div>

          {tokensLoading ? <div className="flex justify-center py-14"><Spinner /></div>
            : tokens.length === 0 ? (
              <div className="flex flex-col items-center py-14 text-gray-400">
                <Hash size={40} className="mb-3 opacity-40" />
                <p className="text-sm">No tokens for today.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tokens.map((token) => (
                  <Card key={token.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-gray-800 text-xl">{token.token_number}</p>
                          <p className="text-xs text-gray-400">{safeTime(token.token_time)}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TOKEN_STATUS_COLORS[token.status] ?? ''}`}>
                          {token.status}
                        </span>
                      </div>
                      <ul className="text-sm space-y-0.5 mb-3">
                        {token.items.map((item, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="font-bold text-orange-600">{item.qty}×</span>
                            <span className="text-gray-700">{item.name}</span>
                          </li>
                        ))}
                      </ul>
                      {token.token_amount && (
                        <p className="font-bold text-gray-900 mb-2">
                          ₹{token.token_amount.toLocaleString('en-IN')}
                        </p>
                      )}
                      {token.status === 'pending' && (
                        <Button variant="primary" size="sm" className="w-full"
                          onClick={() => updateTokenStatus.mutate({ id: token.id, action: 'ready' })}>Mark Ready</Button>
                      )}
                      {token.status === 'ready' && (
                        <Button variant="primary" size="sm" className="w-full bg-green-600 hover:bg-green-700"
                          onClick={() => updateTokenStatus.mutate({ id: token.id, action: 'served' })}>Mark Served</Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
        </div>
      )}

      {/* ── ADD TABLE MODAL ───────────────────────────────────────────────── */}
      <Modal open={addTableOpen} onClose={() => setAddTableOpen(false)} title="Add Table">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Table Number / Name *</label>
            <input value={tableNum} onChange={(e) => setTableNum(e.target.value)} placeholder="e.g. T1 or Table 5"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seats</label>
            <input type="number" min="1" max="50" value={tableSeats} onChange={(e) => setTableSeats(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="md" onClick={() => setAddTableOpen(false)}>Cancel</Button>
            <Button variant="primary" size="md" onClick={() => addTableMutation.mutate()} disabled={!tableNum || addTableMutation.isPending}>
              {addTableMutation.isPending ? <Spinner /> : 'Add Table'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── ADD KOT MODAL ─────────────────────────────────────────────────── */}
      <Modal open={addKotOpen} onClose={() => setAddKotOpen(false)} title="New Kitchen Order (KOT)">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Table (optional)</label>
            <select value={kotTableId} onChange={(e) => setKotTableId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]">
              <option value="">— No table / takeaway —</option>
              {tables.map((t) => <option key={t.id} value={t.id}>{t.table_number} ({t.seats} seats)</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Items *</label>
            <ItemRows rows={kotItems} onChange={setKotItems} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={kotNotes} onChange={(e) => setKotNotes(e.target.value)} rows={2} placeholder="Special instructions..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="md" onClick={() => setAddKotOpen(false)}>Cancel</Button>
            <Button variant="primary" size="md"
              onClick={() => { if (kotItems.some((r) => !r.name)) { toast.error('Fill all item names'); return; } addKotMutation.mutate(); }}
              disabled={addKotMutation.isPending}>
              {addKotMutation.isPending ? <Spinner /> : 'Send to Kitchen'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── ADD TOKEN MODAL ───────────────────────────────────────────────── */}
      <Modal open={addTokenOpen} onClose={() => setAddTokenOpen(false)} title="Issue Token">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Items *</label>
            <ItemRows rows={tokenItems} onChange={setTokenItems} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input value={tokenNotes} onChange={(e) => setTokenNotes(e.target.value)} placeholder="Optional notes..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="md" onClick={() => setAddTokenOpen(false)}>Cancel</Button>
            <Button variant="primary" size="md"
              onClick={() => { if (tokenItems.some((r) => !r.name)) { toast.error('Fill all item names'); return; } addTokenMutation.mutate(); }}
              disabled={addTokenMutation.isPending}>
              {addTokenMutation.isPending ? <Spinner /> : 'Issue Token'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* KOT auto-print slip */}
      {kotToPrint && (
        <PrintKotSlip
          kot={kotToPrint}
          autoPrint
          onClose={() => setKotToPrint(null)}
        />
      )}
    </div>
  );
}

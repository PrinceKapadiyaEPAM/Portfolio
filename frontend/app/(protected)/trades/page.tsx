'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchTrades, createTrade, updateTrade, deleteTrade } from '@/lib/strategy-api';
import type { Trade } from '@/lib/strategy-api';
import Modal from '@/components/ui/Modal';
import TradeForm from '@/components/strategy/TradeForm';
import StatusBadge from '@/components/strategy/StatusBadge';

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const ACTIVE_STATUSES = [
  'active','accumulating','partially_accumulated',
  'fully_accumulated','targeting','partially_exited',
];

// Full class strings so Tailwind's scanner includes them
const ACCENT: Record<string, string> = {
  draft:                'border-l-gray-300',
  active:               'border-l-blue-500',
  accumulating:         'border-l-indigo-500',
  partially_accumulated:'border-l-indigo-400',
  fully_accumulated:    'border-l-indigo-700',
  targeting:            'border-l-purple-500',
  partially_exited:     'border-l-orange-400',
  closed:               'border-l-green-500',
  stopped_out:          'border-l-red-500',
  cancelled:            'border-l-gray-300',
};

const BAR_COLOR: Record<string, string> = {
  fully_accumulated: 'bg-green-500',
  targeting:         'bg-purple-500',
  partially_exited:  'bg-purple-400',
  closed:            'bg-green-400',
  stopped_out:       'bg-red-400',
};

function StatPill({ count, label, colorClass }: { count: number; label: string; colorClass: string }) {
  return (
    <div className={`inline-flex items-baseline gap-1.5 px-3 py-1.5 rounded-lg border ${colorClass}`}>
      <span className="text-base font-bold leading-none">{count}</span>
      <span className="text-xs font-medium uppercase tracking-wide leading-none">{label}</span>
    </div>
  );
}

function StrategyCard({
  trade,
  selectedTags,
  onToggleTag,
  onEdit,
  onDelete,
}: {
  trade: Trade;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onEdit: (t: Trade) => void;
  onDelete: (t: Trade) => void;
}) {
  const t = trade;
  const progress = t.plannedQty > 0 ? Math.min(100, (t.purchasedQty / t.plannedQty) * 100) : 0;
  const barColor = BAR_COLOR[t.status] ?? 'bg-indigo-500';
  const accent = ACCENT[t.status] ?? 'border-l-gray-300';

  return (
    <div className={`bg-white border border-gray-200 border-l-4 ${accent} rounded-xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow`}>

      {/* Header: symbol + status + tradeId */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">{t.symbol}</p>
          <p className="text-sm text-gray-500 truncate mt-0.5">{t.name}</p>
        </div>
        <div className="shrink-0 text-right">
          <StatusBadge status={t.status} />
          <p className="font-mono text-[10px] text-gray-300 mt-1.5">{t.tradeId}</p>
        </div>
      </div>

      {/* Accumulation progress */}
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-gray-400">Accumulation</span>
          <span className="font-semibold text-gray-600">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-500`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="border-t border-gray-100" />

      {/* Metrics grid — 2 × 2 */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Buy Range</p>
          <p className="text-sm font-medium text-gray-700">₹{fmt(t.buyRangeLow)} – ₹{fmt(t.buyRangeHigh)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Avg Cost</p>
          <p className="text-sm font-medium text-gray-700">{t.avgCost != null ? `₹${fmt(t.avgCost)}` : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Qty Held</p>
          <p className="text-sm font-medium text-gray-700">{t.currentQty > 0 ? fmt(t.currentQty) : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Realized P&amp;L</p>
          {t.realizedPnl !== 0 ? (
            <p className={`text-sm font-semibold ${t.realizedPnl > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {t.realizedPnl > 0 ? '+' : ''}₹{fmt(t.realizedPnl)}&nbsp;{t.realizedPnl > 0 ? '▲' : '▼'}
            </p>
          ) : (
            <p className="text-sm text-gray-400">—</p>
          )}
        </div>
      </div>

      {/* Next level / target chips */}
      {(t.nextLevel || t.nextTarget) && (
        <div className="flex flex-col gap-1.5">
          {t.nextLevel && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg">
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">Next</span>
              <span className="text-xs font-semibold text-indigo-700">
                A{t.nextLevel.levelNum} @ ₹{fmt(t.nextLevel.triggerPrice)}
              </span>
              <span className="ml-auto text-xs text-indigo-400">qty {fmt(t.nextLevel.plannedQty)}</span>
            </div>
          )}
          {t.nextTarget && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-100 rounded-lg">
              <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wide">Target</span>
              <span className="text-xs font-semibold text-purple-700">
                T{t.nextTarget.levelNum} @ ₹{fmt(t.nextTarget.targetPrice)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {t.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {t.tags.map((tag) => (
            <button
              key={tag}
              onClick={() => onToggleTag(tag)}
              className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                selectedTags.includes(tag)
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        <Link
          href={`/trades/${t.id}`}
          className="flex-1 text-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          View
        </Link>
        <button
          onClick={() => onEdit(t)}
          className="flex-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(t)}
          className="px-3 py-1.5 text-sm text-red-400 border border-red-100 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
          aria-label="Delete"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default function TradesPage() {
  const [trades, setTrades]             = useState<Trade[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSymbol, setFilterSymbol] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allKnownTags, setAllKnownTags] = useState<string[]>([]);
  const [createOpen, setCreateOpen]     = useState(false);
  const [editTarget, setEditTarget]     = useState<Trade | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Trade | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [deleteError, setDeleteError]   = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchTrades({
        status: filterStatus || undefined,
        symbol: filterSymbol.trim() || undefined,
        tags:   selectedTags.length > 0 ? selectedTags : undefined,
      });
      setTrades(data);
      setAllKnownTags((prev) => {
        const merged = new Set([...prev, ...data.flatMap((t) => t.tags)]);
        return [...merged].sort();
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterStatus, filterSymbol, selectedTags]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  async function handleCreate(data: Parameters<typeof createTrade>[0]) {
    const created = await createTrade(data);
    setTrades((prev) => [created, ...prev]);
    setAllKnownTags((prev) => {
      const merged = new Set([...prev, ...created.tags]);
      return [...merged].sort();
    });
    setCreateOpen(false);
  }

  async function handleEdit(data: Parameters<typeof updateTrade>[1]) {
    if (!editTarget) return;
    const updated = await updateTrade(editTarget.id, data);
    setTrades((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
    setAllKnownTags((prev) => {
      const merged = new Set([...prev, ...(updated.tags ?? [])]);
      return [...merged].sort();
    });
    setEditTarget(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteTrade(deleteTarget.id);
      setTrades((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err?.response?.data?.message ?? err?.message ?? 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  }

  const totalCount     = trades.length;
  const activeCount    = trades.filter((t) => ACTIVE_STATUSES.includes(t.status)).length;
  const targetingCount = trades.filter((t) => t.status === 'targeting').length;

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Strategies</h1>
          {!loading && (
            <div className="flex gap-2 mt-2 flex-wrap">
              <StatPill
                count={totalCount}
                label="Total"
                colorClass="bg-white border-gray-200 text-gray-700"
              />
              {activeCount > 0 && (
                <StatPill
                  count={activeCount}
                  label="Active"
                  colorClass="bg-blue-50 border-blue-200 text-blue-700"
                />
              )}
              {targetingCount > 0 && (
                <StatPill
                  count={targetingCount}
                  label="Targeting"
                  colorClass="bg-purple-50 border-purple-200 text-purple-700"
                />
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Strategy
        </button>
      </div>

      {/* Modals */}
      <Modal title="New Strategy" open={createOpen} onClose={() => setCreateOpen(false)} size="lg">
        <TradeForm onCancel={() => setCreateOpen(false)} onSubmit={handleCreate} />
      </Modal>

      <Modal title="Edit Strategy" open={editTarget !== null} onClose={() => setEditTarget(null)} size="lg">
        {editTarget && (
          <TradeForm
            mode="edit"
            initialValues={editTarget}
            onCancel={() => setEditTarget(null)}
            onSubmit={handleEdit}
          />
        )}
      </Modal>

      <Modal
        title="Delete Strategy"
        open={deleteTarget !== null}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Delete <span className="font-semibold">{deleteTarget.name}</span>? This cannot be undone.
              Only draft or cancelled strategies can be deleted.
            </p>
            {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Compact filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={filterSymbol}
          onChange={(e) => setFilterSymbol(e.target.value.toUpperCase())}
          placeholder="Symbol"
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-28 bg-white"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="accumulating">Accumulating</option>
          <option value="fully_accumulated">Fully Accumulated</option>
          <option value="targeting">Targeting</option>
          <option value="partially_exited">Partially Exited</option>
          <option value="closed">Closed</option>
          <option value="stopped_out">Stopped Out</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {allKnownTags.length > 0 && (
          <>
            <div className="w-px h-5 bg-gray-200 hidden sm:block" />
            {allKnownTags.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
          </>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse border border-gray-200 border-l-4 border-l-gray-200" />
          ))}
        </div>
      ) : trades.length === 0 ? (
        <div className="py-24 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">
            {selectedTags.length > 0 || filterStatus || filterSymbol
              ? 'No strategies match your filters.'
              : 'No strategies yet.'}
          </p>
          {!selectedTags.length && !filterStatus && !filterSymbol && (
            <p className="text-xs text-gray-400 mt-1">Click "+ New Strategy" to get started.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trades.map((t) => (
            <StrategyCard
              key={t.id}
              trade={t}
              selectedTags={selectedTags}
              onToggleTag={toggleTag}
              onEdit={(trade) => setEditTarget(trade)}
              onDelete={(trade) => { setDeleteError(null); setDeleteTarget(trade); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

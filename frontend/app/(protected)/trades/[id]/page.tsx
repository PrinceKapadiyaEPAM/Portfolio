'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { fetchTrade, updateLevel, recordTransaction, deleteTransaction, saveTargets, updateTrade } from '@/lib/strategy-api';
import type { Trade, AccumulationLevel, TradeTarget, TradeTransaction } from '@/lib/strategy-api';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/strategy/StatusBadge';
import RecordTransactionForm from '@/components/strategy/RecordTransactionForm';
import TagInput from '@/components/strategy/TagInput';

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PnlCell({ v }: { v: number | null }) {
  if (v == null) return <span className="text-gray-400">—</span>;
  return <span className={v >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{v >= 0 ? '+' : ''}₹{fmt(v)}</span>;
}

export default function TradeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [trade, setTrade]         = useState<Trade | null>(null);
  const [loading, setLoading]     = useState(true);
  const [txnOpen, setTxnOpen]     = useState(false);
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [targetRows, setTargetRows] = useState<{ levelNum: number; targetPrice: string; plannedQty: string; plannedPct: string }[]>([]);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchTrade(id);
      setTrade(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  function openTargetModal() {
    if (!trade) return;
    setTargetRows(
      trade.targets.length > 0
        ? trade.targets.map((t) => ({
            levelNum:   t.levelNum,
            targetPrice: String(t.targetPrice),
            plannedQty:  t.plannedQty != null ? String(t.plannedQty) : '',
            plannedPct:  t.plannedPct != null ? String(t.plannedPct) : '',
          }))
        : [{ levelNum: 1, targetPrice: '', plannedQty: '', plannedPct: '' }],
    );
    setTargetModalOpen(true);
  }

  async function handleSaveTargets() {
    const targets = targetRows
      .filter((r) => r.targetPrice.trim())
      .map((r) => ({
        levelNum:    r.levelNum,
        targetPrice: parseFloat(r.targetPrice),
        plannedQty:  r.plannedQty ? parseFloat(r.plannedQty) : undefined,
        plannedPct:  r.plannedPct ? parseFloat(r.plannedPct) : undefined,
      }));
    await saveTargets(id, targets);
    setTargetModalOpen(false);
    load();
  }

  async function handleMarkLevel(level: AccumulationLevel) {
    const priceStr = prompt(`Mark A${level.levelNum} as filled — enter executed price:`, String(level.triggerPrice));
    if (!priceStr) return;
    await updateLevel(id, level.id, {
      status:        'filled',
      executedPrice: parseFloat(priceStr),
      executedQty:   Number(level.plannedQty),
      executedAt:    new Date().toISOString(),
    });
    load();
  }

  async function handleRecordTxn(data: Parameters<typeof recordTransaction>[1]) {
    await recordTransaction(id, data);
    setTxnOpen(false);
    load();
  }

  async function handleDeleteTxn(txn: TradeTransaction) {
    if (!confirm('Delete this transaction? Portfolio will be reversed.')) return;
    await deleteTransaction(txn.id);
    load();
  }

  async function handleStatusChange(newStatus: string) {
    await updateTrade(id, { status: newStatus });
    load();
  }

  async function handleSaveTags() {
    await updateTrade(id, { tags: draftTags });
    setEditingTags(false);
    load();
  }

  if (loading) return <div className="animate-pulse h-64 bg-gray-200 rounded" />;
  if (!trade)  return <p className="text-gray-500">Trade not found.</p>;

  const statusOptions = ['draft','active','accumulating','partially_accumulated','fully_accumulated','targeting','partially_exited','closed','stopped_out','cancelled'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/trades" className="text-sm text-gray-400 hover:text-gray-600">← Strategies</Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold text-gray-900">{trade.name}</h1>
            <StatusBadge status={trade.status} />
          </div>
          <div className="flex gap-4 mt-1 text-sm text-gray-500">
            <span className="font-semibold text-gray-700">{trade.symbol}</span>
            <span className="font-mono text-xs text-gray-400">{trade.tradeId}</span>
            <span>Range: ₹{fmt(trade.buyRangeLow)} – ₹{fmt(trade.buyRangeHigh)}</span>
            {trade.slType && <span>SL: {trade.slType}{trade.slValue != null ? ` @ ₹${fmt(trade.slValue)}` : ''}</span>}
          </div>
          {trade.description && <p className="text-sm text-gray-500 mt-1">{trade.description}</p>}

          {/* Tags */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {!editingTags ? (
              <>
                {trade.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium rounded-full">
                    {tag}
                  </span>
                ))}
                <button
                  onClick={() => { setDraftTags(trade.tags); setEditingTags(true); }}
                  className="text-xs text-gray-400 hover:text-gray-600 border border-dashed border-gray-300 rounded-full px-2 py-0.5"
                >
                  {trade.tags.length === 0 ? '+ add tags' : '✎ edit tags'}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 w-full max-w-md">
                <div className="flex-1">
                  <TagInput tags={draftTags} onChange={setDraftTags} placeholder="Add tags…" />
                </div>
                <button onClick={handleSaveTags} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
                <button onClick={() => setEditingTags(false)} className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Update Status</label>
          <select
            value={trade.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none"
          >
            {statusOptions.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Planned Qty',  value: fmt(trade.plannedQty) },
          { label: 'Purchased',    value: fmt(trade.purchasedQty) },
          { label: 'Current Qty',  value: fmt(trade.currentQty) },
          { label: 'Avg Cost',     value: trade.avgCost != null ? `₹${fmt(trade.avgCost)}` : '—' },
          { label: 'Invested',     value: trade.totalInvested > 0 ? `₹${fmt(trade.totalInvested)}` : '—' },
          { label: 'Realized P&L', value: null, pnl: trade.realizedPnl },
          { label: 'LTP',          value: trade.ltp != null ? `₹${fmt(trade.ltp)}` : '—' },
          { label: 'Unreal P&L',   value: null, pnl: trade.unrealizedPnl ?? null },
        ].map((card, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-500">{card.label}</p>
            {card.pnl !== undefined
              ? <PnlCell v={card.pnl} />
              : <p className="text-sm font-semibold text-gray-800 mt-0.5">{card.value}</p>}
          </div>
        ))}
      </div>

      {/* Accumulation Levels */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Accumulation Levels</h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Level</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Trigger Price</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Planned Qty</th>
                <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Exec Qty</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Exec Price</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {trade.accLevels.map((l) => (
                <tr key={l.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2 font-semibold text-gray-700">A{l.levelNum}</td>
                  <td className="px-4 py-2 text-right text-gray-700">₹{fmt(l.triggerPrice)}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{fmt(l.plannedQty)}</td>
                  <td className="px-4 py-2 text-center"><StatusBadge status={l.status} /></td>
                  <td className="px-4 py-2 text-right text-gray-600">{Number(l.executedQty) > 0 ? fmt(Number(l.executedQty)) : '—'}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{l.executedPrice != null ? `₹${fmt(l.executedPrice)}` : '—'}</td>
                  <td className="px-4 py-2 text-right">
                    {l.status === 'pending' && (
                      <button onClick={() => handleMarkLevel(l)} className="text-xs text-blue-600 hover:text-blue-800">Mark Filled</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Targets */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">Targets</h2>
          <button onClick={openTargetModal} className="text-sm text-blue-600 hover:text-blue-800">
            {trade.targets.length > 0 ? 'Edit Targets' : 'Add Targets'}
          </button>
        </div>
        {trade.targets.length === 0 ? (
          <div className="text-center py-8 text-gray-400 border border-dashed border-gray-200 rounded-lg text-sm">
            No targets defined yet.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Target</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Price</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Planned Qty</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Planned %</th>
                  <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Exec Qty</th>
                </tr>
              </thead>
              <tbody>
                {trade.targets.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-2 font-semibold text-gray-700">T{t.levelNum}</td>
                    <td className="px-4 py-2 text-right text-gray-700">₹{fmt(t.targetPrice)}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{t.plannedQty != null ? fmt(t.plannedQty) : '—'}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{t.plannedPct != null ? `${t.plannedPct}%` : '—'}</td>
                    <td className="px-4 py-2 text-center"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-2 text-right text-gray-600">{Number(t.executedQty) > 0 ? fmt(Number(t.executedQty)) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">Transactions</h2>
          <button
            onClick={() => setTxnOpen(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            Record Transaction
          </button>
        </div>
        {trade.transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-400 border border-dashed border-gray-200 rounded-lg text-sm">
            No transactions recorded yet.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Ref</th>
                  <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Side</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Price</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">P&L</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Charges</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {trade.transactions.map((txn) => (
                  <tr key={txn.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-600 text-xs">{new Date(txn.executedAt).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-400">{txn.txnRef}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`text-xs font-semibold ${txn.side === 'BUY' ? 'text-green-600' : 'text-red-600'}`}>{txn.side}</span>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700">{fmt(txn.qty)}</td>
                    <td className="px-4 py-2 text-right text-gray-700">₹{fmt(txn.price)}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{txn.txnType.toLowerCase().replace(/_/g, ' ')}</td>
                    <td className="px-4 py-2 text-right"><PnlCell v={txn.pnl} /></td>
                    <td className="px-4 py-2 text-right text-gray-500">{Number(txn.charges) > 0 ? `₹${fmt(txn.charges)}` : '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => handleDeleteTxn(txn)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal title="Record Transaction" open={txnOpen} onClose={() => setTxnOpen(false)}>
        <RecordTransactionForm
          accLevels={trade.accLevels}
          targets={trade.targets}
          onCancel={() => setTxnOpen(false)}
          onSubmit={handleRecordTxn}
        />
      </Modal>

      <Modal title="Edit Targets" open={targetModalOpen} onClose={() => setTargetModalOpen(false)}>
        <div className="space-y-3">
          {targetRows.map((row, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="w-10 text-sm font-semibold text-gray-600 pb-2">T{row.levelNum}</div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Price</label>
                <input type="number" step="0.01" value={row.targetPrice}
                  onChange={(e) => { const r = [...targetRows]; r[i].targetPrice = e.target.value; setTargetRows(r); }}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" placeholder="1600" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Qty (optional)</label>
                <input type="number" step="0.01" value={row.plannedQty}
                  onChange={(e) => { const r = [...targetRows]; r[i].plannedQty = e.target.value; setTargetRows(r); }}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" placeholder="—" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">% (optional)</label>
                <input type="number" step="0.01" value={row.plannedPct}
                  onChange={(e) => { const r = [...targetRows]; r[i].plannedPct = e.target.value; setTargetRows(r); }}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" placeholder="—" />
              </div>
              <button type="button" onClick={() => setTargetRows((prev) => prev.filter((_, j) => j !== i))}
                className="pb-2 text-red-400 hover:text-red-600">✕</button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setTargetRows((prev) => [...prev, { levelNum: prev.length + 1, targetPrice: '', plannedQty: '', plannedPct: '' }])}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            + Add Target
          </button>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setTargetModalOpen(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={handleSaveTargets} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Targets</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

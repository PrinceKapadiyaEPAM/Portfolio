'use client';
import { useState } from 'react';
import type { AccumulationLevel, TradeTarget } from '@/lib/strategy-api';

interface Props {
  accLevels: AccumulationLevel[];
  targets: TradeTarget[];
  onCancel: () => void;
  onSubmit: (data: {
    side: string; qty: number; price: number; executedAt: string; txnType: string;
    accumulationLevelId?: string; targetId?: string; charges?: number; notes?: string;
  }) => Promise<void>;
}

export default function RecordTransactionForm({ accLevels, targets, onCancel, onSubmit }: Props) {
  const [side, setSide]         = useState('BUY');
  const [qty, setQty]           = useState('');
  const [price, setPrice]       = useState('');
  const [executedAt, setExecutedAt] = useState(new Date().toISOString().slice(0, 16));
  const [txnType, setTxnType]   = useState('ACCUMULATION');
  const [levelId, setLevelId]   = useState('');
  const [targetId, setTargetId] = useState('');
  const [charges, setCharges]   = useState('');
  const [notes, setNotes]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        side,
        qty:         parseFloat(qty),
        price:       parseFloat(price),
        executedAt:  new Date(executedAt).toISOString(),
        txnType,
        accumulationLevelId: levelId || undefined,
        targetId:    targetId || undefined,
        charges:     charges ? parseFloat(charges) : undefined,
        notes:       notes || undefined,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to record transaction');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Side</label>
          <select value={side} onChange={(e) => setSide(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select value={txnType} onChange={(e) => setTxnType(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="ACCUMULATION">Accumulation</option>
            <option value="TARGET">Target</option>
            <option value="STOP_LOSS">Stop Loss</option>
            <option value="MANUAL">Manual</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Qty</label>
          <input type="number" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required placeholder="100" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
          <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required placeholder="1500" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Executed At</label>
          <input type="datetime-local" value={executedAt} onChange={(e) => setExecutedAt(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required />
        </div>
        {txnType === 'ACCUMULATION' && accLevels.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Accumulation Level</label>
            <select value={levelId} onChange={(e) => setLevelId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">None</option>
              {accLevels.map((l) => (
                <option key={l.id} value={l.id}>A{l.levelNum} @ ₹{Number(l.triggerPrice).toLocaleString('en-IN')}</option>
              ))}
            </select>
          </div>
        )}
        {txnType === 'TARGET' && targets.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">None</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>T{t.levelNum} @ ₹{Number(t.targetPrice).toLocaleString('en-IN')}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Charges</label>
          <input type="number" step="0.01" value={charges} onChange={(e) => setCharges(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Optional" />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Recording…' : 'Record'}
        </button>
      </div>
    </form>
  );
}

'use client';
import { useState } from 'react';
import TagInput from './TagInput';
import type { Trade } from '@/lib/strategy-api';

interface CreatePayload {
  name: string; description?: string; tags?: string[]; symbol: string;
  buyRangeHigh: number; buyRangeLow: number;
  levelCount: number; defaultQtyPerLevel: number;
  slType?: string; slValue?: number; slReference?: string; notes?: string;
}

interface EditPayload {
  name: string; description?: string; tags?: string[]; symbol: string;
  buyRangeHigh: number; buyRangeLow: number; status: string;
  slType?: string; slValue?: number; slReference?: string; notes?: string;
}

interface CreateProps {
  mode?: 'create';
  initialValues?: undefined;
  onCancel: () => void;
  onSubmit: (data: CreatePayload) => Promise<void>;
}

interface EditProps {
  mode: 'edit';
  initialValues: Trade;
  onCancel: () => void;
  onSubmit: (data: EditPayload) => Promise<void>;
}

type Props = CreateProps | EditProps;

const STATUS_OPTIONS = [
  'draft','active','accumulating','partially_accumulated','fully_accumulated',
  'targeting','partially_exited','closed','stopped_out','cancelled',
];

export default function TradeForm({ mode = 'create', initialValues, onCancel, onSubmit }: Props) {
  const iv = initialValues as Trade | undefined;

  const [name, setName]               = useState(iv?.name ?? '');
  const [description, setDescription] = useState(iv?.description ?? '');
  const [tags, setTags]               = useState<string[]>(iv?.tags ?? []);
  const [symbol, setSymbol]           = useState(iv?.symbol ?? '');
  const [buyHigh, setBuyHigh]         = useState(iv ? String(iv.buyRangeHigh) : '');
  const [buyLow, setBuyLow]           = useState(iv ? String(iv.buyRangeLow) : '');
  const [status, setStatus]           = useState(iv?.status ?? 'draft');
  const [levelCount, setLevelCount]   = useState('5');
  const [qtyPerLevel, setQtyPerLevel] = useState('');
  const [slType, setSlType]           = useState(iv?.slType ?? '');
  const [slValue, setSlValue]         = useState(iv?.slValue != null ? String(iv.slValue) : '');
  const [slReference, setSlReference] = useState(iv?.slReference ?? '');
  const [notes, setNotes]             = useState(iv?.notes ?? '');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const high = parseFloat(buyHigh);
  const low  = parseFloat(buyLow);
  const count = parseInt(levelCount, 10);
  const qty  = parseFloat(qtyPerLevel);

  const previewLevels = mode === 'create' && !isNaN(high) && !isNaN(low) && high > low && count >= 1
    ? Array.from({ length: count }, (_, i) => {
        const step = count === 1 ? 0 : (high - low) / (count - 1);
        return parseFloat((high - i * step).toFixed(2));
      })
    : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === 'create' && (!name.trim() || !symbol.trim() || isNaN(high) || isNaN(low) || isNaN(count) || isNaN(qty))) return;
    if (mode === 'edit'   && (!name.trim() || !symbol.trim() || isNaN(high) || isNaN(low))) return;
    if (low >= high) { setError('Buy range low must be less than high'); return; }

    setSaving(true);
    setError(null);
    try {
      if (mode === 'edit') {
        await (onSubmit as (d: EditPayload) => Promise<void>)({
          name:         name.trim(),
          description:  description.trim() || undefined,
          tags:         tags.length > 0 ? tags : [],
          symbol:       symbol.trim().toUpperCase(),
          buyRangeHigh: high,
          buyRangeLow:  low,
          status,
          slType:       slType || undefined,
          slValue:      slValue ? parseFloat(slValue) : undefined,
          slReference:  slReference || undefined,
          notes:        notes || undefined,
        });
      } else {
        await (onSubmit as (d: CreatePayload) => Promise<void>)({
          name:         name.trim(),
          description:  description.trim() || undefined,
          tags:         tags.length > 0 ? tags : undefined,
          symbol:       symbol.trim().toUpperCase(),
          buyRangeHigh: high,
          buyRangeLow:  low,
          levelCount:   count,
          defaultQtyPerLevel: qty,
          slType:       slType || undefined,
          slValue:      slValue ? parseFloat(slValue) : undefined,
          slReference:  slReference || undefined,
          notes:        notes || undefined,
        });
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Strategy Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. RELIANCE Q4 breakout" maxLength={100} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400">(optional)</span></label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2} placeholder="Your trade thesis or notes" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tags <span className="text-gray-400">(press Enter, comma, or space)</span></label>
        <TagInput tags={tags} onChange={setTags} placeholder="e.g. momentum, breakout, q4" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
          <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. RELIANCE" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Buy Range High</label>
          <input type="number" step="0.01" value={buyHigh} onChange={(e) => setBuyHigh(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="1500" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Buy Range Low</label>
          <input type="number" step="0.01" value={buyLow} onChange={(e) => setBuyLow(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="1400" required />
        </div>

        {mode === 'create' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Levels</label>
              <input type="number" min="1" max="10" value={levelCount} onChange={(e) => setLevelCount(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qty per Level</label>
              <input type="number" step="0.01" value={qtyPerLevel} onChange={(e) => setQtyPerLevel(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="100" required />
            </div>
          </>
        )}
      </div>

      {previewLevels.length > 0 && (
        <div className="bg-gray-50 rounded-md p-3 text-xs text-gray-600">
          <p className="font-medium mb-1">Auto-generated levels:</p>
          <div className="flex flex-wrap gap-2">
            {previewLevels.map((p, i) => (
              <span key={i} className="bg-white border border-gray-200 rounded px-2 py-0.5">A{i + 1}: ₹{p.toLocaleString('en-IN')}</span>
            ))}
          </div>
        </div>
      )}

      {mode === 'edit' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SL Type</label>
          <select value={slType} onChange={(e) => setSlType(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">None</option>
            <option value="CLBS">CLBS</option>
            <option value="WLBS">WLBS</option>
            <option value="FIXED">Fixed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SL Value</label>
          <input type="number" step="0.01" value={slValue} onChange={(e) => setSlValue(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="optional" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SL Reference</label>
          <input value={slReference} onChange={(e) => setSlReference(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. support level" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2} placeholder="Optional notes" />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Create Strategy'}
        </button>
      </div>
    </form>
  );
}

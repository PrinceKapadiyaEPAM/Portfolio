'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import TagInput from './TagInput';
import type { Trade } from '@/lib/strategy-api';
import { searchSymbols, type SymbolSuggestion } from '@/lib/screener-api';

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
  'draft', 'active', 'accumulating', 'partially_accumulated', 'fully_accumulated',
  'targeting', 'partially_exited', 'closed', 'stopped_out', 'cancelled',
];

const SL_TYPES = [
  { value: '',      label: 'None'  },
  { value: 'CLBS',  label: 'CLBS'  },
  { value: 'WLBS',  label: 'WLBS'  },
  { value: 'FIXED', label: 'Fixed' },
];

const INPUT = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white placeholder:text-gray-400';
const LABEL = 'block text-xs font-semibold text-gray-500 mb-1.5';

function SectionHeader({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] whitespace-nowrap">
        {label}
      </span>
      {hint && <span className="text-[10px] text-gray-300 italic">{hint}</span>}
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

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

  const [suggestions, setSuggestions]         = useState<SymbolSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIdx, setActiveIdx]             = useState(-1);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const symbolWrapRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
    try {
      const data = await searchSymbols(q);
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
      setActiveIdx(-1);
    } catch {
      setSuggestions([]); setShowSuggestions(false);
    }
  }, []);

  function handleSymbolChange(val: string) {
    const upper = val.toUpperCase();
    setSymbol(upper);
    setShowSuggestions(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(upper), 300);
  }

  function pickSuggestion(s: SymbolSuggestion) {
    setSymbol(s.symbol);
    setSuggestions([]);
    setShowSuggestions(false);
    if (s.ltp > 0) {
      setBuyHigh(s.ltp.toFixed(2));
      setBuyLow((s.ltp * 0.97).toFixed(2));
    }
  }

  function handleSymbolKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      pickSuggestion(suggestions[activeIdx]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (symbolWrapRef.current && !symbolWrapRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const high  = parseFloat(buyHigh);
  const low   = parseFloat(buyLow);
  const count = parseInt(levelCount, 10);
  const qty   = parseFloat(qtyPerLevel);
  const rangeValid = !isNaN(high) && !isNaN(low) && high > low && high > 0 && low > 0;
  const rangeEntered = buyHigh !== '' && buyLow !== '' && !isNaN(high) && !isNaN(low);

  const previewLevels = mode === 'create' && rangeValid && !isNaN(count) && count >= 1 && count <= 10
    ? Array.from({ length: count }, (_, i) => {
        const step = count === 1 ? 0 : (high - low) / (count - 1);
        return parseFloat((high - i * step).toFixed(2));
      })
    : [];

  const totalInvestment = rangeValid && !isNaN(count) && !isNaN(qty) && qty > 0
    ? ((high + low) / 2) * qty * count
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === 'create' && (!name.trim() || !symbol.trim() || isNaN(high) || isNaN(low) || isNaN(count) || isNaN(qty))) return;
    if (mode === 'edit'   && (!name.trim() || !symbol.trim() || isNaN(high) || isNaN(low))) return;
    if (low >= high) { setError('Range low must be less than range high'); return; }

    setSaving(true);
    setError(null);
    try {
      if (mode === 'edit') {
        await (onSubmit as (d: EditPayload) => Promise<void>)({
          name: name.trim(), description: description.trim() || undefined,
          tags: tags.length > 0 ? tags : [],
          symbol: symbol.trim().toUpperCase(),
          buyRangeHigh: high, buyRangeLow: low, status,
          slType: slType || undefined,
          slValue: slValue ? parseFloat(slValue) : undefined,
          slReference: slReference || undefined,
          notes: notes || undefined,
        });
      } else {
        await (onSubmit as (d: CreatePayload) => Promise<void>)({
          name: name.trim(), description: description.trim() || undefined,
          tags: tags.length > 0 ? tags : undefined,
          symbol: symbol.trim().toUpperCase(),
          buyRangeHigh: high, buyRangeLow: low,
          levelCount: count, defaultQtyPerLevel: qty,
          slType: slType || undefined,
          slValue: slValue ? parseFloat(slValue) : undefined,
          slReference: slReference || undefined,
          notes: notes || undefined,
        });
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-sm">

      {/* ── OVERVIEW ── */}
      <div>
        <SectionHeader label="Overview" />
        <div className="grid grid-cols-[1fr_120px] gap-3 mb-3">
          <div>
            <label className={LABEL}>
              Strategy Name <span className="text-red-400">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={INPUT}
              placeholder="e.g. RELIANCE Q4 breakout"
              maxLength={100}
              required
            />
          </div>
          <div ref={symbolWrapRef} className="relative">
            <label className={LABEL}>
              Symbol <span className="text-red-400">*</span>
            </label>
            <input
              value={symbol}
              onChange={(e) => handleSymbolChange(e.target.value)}
              onKeyDown={handleSymbolKeyDown}
              onFocus={() => symbol.length >= 3 && suggestions.length > 0 && setShowSuggestions(true)}
              className={`${INPUT} font-mono font-bold tracking-wide text-center`}
              placeholder="NIFTY"
              autoComplete="off"
              required
            />
            {showSuggestions && (
              <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <li
                    key={s.symbol}
                    onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s); }}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer text-xs ${
                      i === activeIdx ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-mono font-semibold">{s.symbol}</span>
                    <span className="text-gray-400">₹{s.ltp.toLocaleString('en-IN')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div>
          <label className={LABEL}>
            Description{' '}
            <span className="font-normal text-gray-400">optional</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${INPUT} resize-none`}
            rows={2}
            placeholder="Trade thesis — why you like this setup"
          />
        </div>
      </div>

      {/* ── ENTRY SETUP ── */}
      <div>
        <SectionHeader label="Entry Setup" />

        {/* Buy range row */}
        <div className="grid grid-cols-[1fr_32px_1fr] items-end gap-1.5 mb-4">
          <div>
            <label className={LABEL}>
              Range Low <span className="text-red-400">*</span>
            </label>
            <input
              type="number" step="0.01" min="0"
              value={buyLow}
              onChange={(e) => setBuyLow(e.target.value)}
              className={INPUT}
              placeholder="1400"
              required
            />
          </div>
          <div className="flex justify-center items-center pb-2 text-gray-300 text-base select-none">
            →
          </div>
          <div>
            <label className={LABEL}>
              Range High <span className="text-red-400">*</span>
            </label>
            <input
              type="number" step="0.01" min="0"
              value={buyHigh}
              onChange={(e) => setBuyHigh(e.target.value)}
              className={INPUT}
              placeholder="1500"
              required
            />
          </div>
        </div>

        {/* Inline range validation */}
        {rangeEntered && !rangeValid && (
          <p className="text-xs text-red-500 -mt-2 mb-3">Range low must be less than range high.</p>
        )}

        {/* Levels config — create only */}
        {mode === 'create' && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className={LABEL}>
                Accumulation Levels <span className="text-red-400">*</span>
                <span className="font-normal text-gray-400 ml-1">(1–10)</span>
              </label>
              <input
                type="number" min="1" max="10" step="1"
                value={levelCount}
                onChange={(e) => setLevelCount(e.target.value)}
                className={INPUT}
                required
              />
              <p className="text-[11px] text-gray-400 mt-1">Evenly-spaced buy steps inside the range</p>
            </div>
            <div>
              <label className={LABEL}>
                Qty per Level <span className="text-red-400">*</span>
              </label>
              <input
                type="number" step="1" min="1"
                value={qtyPerLevel}
                onChange={(e) => setQtyPerLevel(e.target.value)}
                className={INPUT}
                placeholder="100"
                required
              />
              <p className="text-[11px] text-gray-400 mt-1">Units to buy at each level</p>
            </div>
          </div>
        )}

        {/* Level preview */}
        {previewLevels.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-bold shrink-0">
                  {count}
                </span>
                <span className="text-xs font-semibold text-indigo-700">Auto-generated levels</span>
              </div>
              {totalInvestment != null && (
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-indigo-400 leading-none mb-0.5">Est. capital</p>
                  <p className="text-sm font-bold text-indigo-700 leading-none">
                    ₹{totalInvestment.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {previewLevels.map((p, i) => (
                <span
                  key={i}
                  className="bg-white border border-indigo-200 rounded-md px-2 py-1 text-[11px] font-semibold text-indigo-700"
                >
                  A{i + 1} · ₹{p.toLocaleString('en-IN')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── STATUS — edit only ── */}
      {mode === 'edit' && (
        <div>
          <SectionHeader label="Status" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={INPUT}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── STOP LOSS ── */}
      <div>
        <SectionHeader label="Stop Loss" hint="optional" />
        <div className="grid grid-cols-4 gap-2 mb-3">
          {SL_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setSlType(value);
                if (!value) { setSlValue(''); setSlReference(''); }
              }}
              className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                slType === value
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {slType ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>SL Value</label>
              <input
                type="number" step="0.01"
                value={slValue}
                onChange={(e) => setSlValue(e.target.value)}
                className={INPUT}
                placeholder="e.g. 1380"
              />
            </div>
            <div>
              <label className={LABEL}>Reference</label>
              <input
                value={slReference}
                onChange={(e) => setSlReference(e.target.value)}
                className={INPUT}
                placeholder="e.g. prior swing low"
              />
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-gray-400 leading-relaxed">
            CLBS = Candle Low Below Support &nbsp;·&nbsp; WLBS = Weekly Low Below Support &nbsp;·&nbsp; Fixed = specific price
          </p>
        )}
      </div>

      {/* ── TAGS & NOTES ── */}
      <div>
        <SectionHeader label="Tags & Notes" hint="optional" />
        <div className="mb-3">
          <label className={LABEL}>
            Tags{' '}
            <span className="font-normal text-gray-400">Enter · comma · space to add</span>
          </label>
          <TagInput tags={tags} onChange={setTags} placeholder="momentum, breakout, q4…" />
        </div>
        <div>
          <label className={LABEL}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`${INPUT} resize-none`}
            rows={2}
            placeholder="Risk notes, reminders, context…"
          />
        </div>
      </div>

      {/* ── ACTIONS ── */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 3h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors min-w-[136px] flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving…
            </>
          ) : mode === 'edit' ? 'Save Changes' : 'Create Strategy'}
        </button>
      </div>
    </form>
  );
}

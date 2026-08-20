'use client';
import { useState, useEffect, useCallback } from 'react';
import { runScreener, fetchPresets, savePreset, deletePreset } from '@/lib/screener-api';
import type { ScreenerFilters, ScreenerRow, ScreenerPreset, ScreenerMeta } from '@/lib/screener-api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | null, d = 2) {
  if (n == null) return '—';
  return n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function PctBadge({ v }: { v: number | null }) {
  if (v == null) return <span className="text-gray-400">—</span>;
  const pos = v >= 0;
  return (
    <span className={`font-medium ${pos ? 'text-green-600' : 'text-red-600'}`}>
      {pos ? '+' : ''}{v.toFixed(2)}%
    </span>
  );
}

const SORT_COLS: { key: ScreenerFilters['sort_by']; label: string }[] = [
  { key: 'changePct',     label: 'Change%' },
  { key: 'volume',        label: 'Volume' },
  { key: 'ltp',           label: 'LTP' },
  { key: 'perChange365d', label: '1Y Change%' },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: ScreenerFilters = { sort_by: 'changePct', sort_order: 'desc', limit: 100 };

export default function ScreenerPage() {
  const [filters, setFilters]       = useState<ScreenerFilters>(DEFAULT_FILTERS);
  const [results, setResults]       = useState<ScreenerRow[]>([]);
  const [meta, setMeta]             = useState<ScreenerMeta | null>(null);
  const [loading, setLoading]       = useState(false);
  const [hasRun, setHasRun]         = useState(false);

  const [presets, setPresets]       = useState<ScreenerPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);

  const loadPresets = useCallback(async () => {
    const p = await fetchPresets();
    setPresets(p);
  }, []);

  useEffect(() => { loadPresets(); }, [loadPresets]);

  async function handleRun() {
    setLoading(true);
    try {
      const res = await runScreener(filters);
      setResults(res.results);
      setMeta(res.meta);
      setHasRun(true);
    } finally {
      setLoading(false);
    }
  }

  function applyPreset(preset: ScreenerPreset) {
    setFilters({ ...DEFAULT_FILTERS, ...preset.filters });
  }

  async function handleSavePreset(e: React.FormEvent) {
    e.preventDefault();
    if (!presetName.trim()) return;
    setSavingPreset(true);
    try {
      await savePreset(presetName.trim(), filters);
      setPresetName('');
      setShowSaveForm(false);
      await loadPresets();
    } finally {
      setSavingPreset(false);
    }
  }

  async function handleDeletePreset(id: string) {
    await deletePreset(id);
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }

  function setNum(key: keyof ScreenerFilters, raw: string) {
    const val = raw === '' ? undefined : Number(raw);
    setFilters((f) => ({ ...f, [key]: val }));
  }

  const sortBy    = filters.sort_by    ?? 'changePct';
  const sortOrder = filters.sort_order ?? 'desc';

  function toggleSort(col: ScreenerFilters['sort_by']) {
    setFilters((f) => ({
      ...f,
      sort_by:    col,
      sort_order: f.sort_by === col && f.sort_order === 'desc' ? 'asc' : 'desc',
    }));
  }

  function SortHeader({ col, label }: { col: ScreenerFilters['sort_by']; label: string }) {
    const active = sortBy === col;
    return (
      <th
        className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-900"
        onClick={() => toggleSort(col)}
      >
        {label} {active ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
      </th>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Stock Screener</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Filter NSE stocks by change%, volume, and 1-year performance
        </p>
      </div>

      <div className="flex gap-5 flex-wrap">
        {/* ── Filter panel ── */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4 w-72 shrink-0">
          <h2 className="text-sm font-semibold text-gray-700">Filters</h2>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-gray-500 uppercase tracking-wide">Change% (today)</legend>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500">Min</label>
                <input type="number" step="0.01" placeholder="-5"
                  value={filters.change_gt ?? ''}
                  onChange={(e) => setNum('change_gt', e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-0.5"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500">Max</label>
                <input type="number" step="0.01" placeholder="5"
                  value={filters.change_lt ?? ''}
                  onChange={(e) => setNum('change_lt', e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-0.5"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-gray-500 uppercase tracking-wide">Volume</legend>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500">Min</label>
                <input type="number" placeholder="500000"
                  value={filters.volume_gt ?? ''}
                  onChange={(e) => setNum('volume_gt', e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-0.5"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500">Max</label>
                <input type="number"
                  value={filters.volume_lt ?? ''}
                  onChange={(e) => setNum('volume_lt', e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-0.5"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-gray-500 uppercase tracking-wide">1-Year Change%</legend>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500">Min</label>
                <input type="number" step="0.01"
                  value={filters.per_change_365d_gt ?? ''}
                  onChange={(e) => setNum('per_change_365d_gt', e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-0.5"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500">Max</label>
                <input type="number" step="0.01"
                  value={filters.per_change_365d_lt ?? ''}
                  onChange={(e) => setNum('per_change_365d_lt', e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-0.5"
                />
              </div>
            </div>
          </fieldset>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setFilters((f) => ({ ...f, sort_by: e.target.value as any }))}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            >
              {SORT_COLS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <div className="flex gap-2 mt-1">
              {(['desc', 'asc'] as const).map((o) => (
                <button key={o}
                  onClick={() => setFilters((f) => ({ ...f, sort_order: o }))}
                  className={`flex-1 py-1 text-xs rounded border ${sortOrder === o ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600'}`}
                >
                  {o === 'desc' ? 'High → Low' : 'Low → High'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Limit</label>
            <select
              value={filters.limit ?? 100}
              onChange={(e) => setFilters((f) => ({ ...f, limit: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            >
              {[50, 100, 200, 500].map((n) => <option key={n} value={n}>{n} results</option>)}
            </select>
          </div>

          <button
            onClick={handleRun}
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Running…' : 'Run Screener'}
          </button>

          <button
            onClick={() => { setFilters(DEFAULT_FILTERS); setResults([]); setHasRun(false); }}
            className="w-full py-1.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-md"
          >
            Reset
          </button>

          {/* ── Presets ── */}
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Presets</span>
              <button onClick={() => setShowSaveForm((v) => !v)} className="text-xs text-blue-600 hover:underline">
                {showSaveForm ? 'Cancel' : '+ Save current'}
              </button>
            </div>

            {showSaveForm && (
              <form onSubmit={handleSavePreset} className="flex gap-1">
                <input
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Preset name"
                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs"
                />
                <button type="submit" disabled={savingPreset} className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                  Save
                </button>
              </form>
            )}

            {presets.length === 0 ? (
              <p className="text-xs text-gray-400">No saved presets.</p>
            ) : (
              <ul className="space-y-1">
                {presets.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-1">
                    <button onClick={() => applyPreset(p)} className="flex-1 text-left text-xs text-blue-700 hover:underline truncate">
                      {p.name}
                    </button>
                    <button onClick={() => handleDeletePreset(p.id)} className="text-xs text-red-400 hover:text-red-600 shrink-0">✕</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Results ── */}
        <div className="flex-1 min-w-0">
          {meta && (
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <span className="text-sm text-gray-600">
                <span className="font-semibold">{results.length}</span> results
                {meta.count > 0 && <span className="text-gray-400 ml-1">(of {meta.count} in snapshot)</span>}
              </span>
              {meta.snappedAt && (
                <span className="text-xs text-gray-400">
                  Snapshot: {new Date(meta.snappedAt).toLocaleString('en-IN')}
                </span>
              )}
            </div>
          )}

          {!hasRun && !loading && (
            <div className="text-center py-24 text-gray-400 bg-white border border-gray-200 rounded-lg">
              <p className="text-sm">Set your filters and click <span className="font-medium text-gray-600">Run Screener</span>.</p>
              {meta?.count === 0 && (
                <p className="text-xs mt-2 text-amber-600">No snapshot data yet — the daily snapshot runs at 15:35 IST.</p>
              )}
            </div>
          )}

          {loading && (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />)}
            </div>
          )}

          {hasRun && !loading && results.length === 0 && (
            <div className="text-center py-16 text-gray-400 bg-white border border-gray-200 rounded-lg">
              <p className="text-sm">No stocks match your filters.</p>
            </div>
          )}

          {hasRun && !loading && results.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Symbol</th>
                    <SortHeader col="ltp"           label="LTP" />
                    <SortHeader col="changePct"     label="Change%" />
                    <SortHeader col="volume"        label="Volume" />
                    <SortHeader col="perChange365d" label="1Y Chg%" />
                    <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">52W High</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">52W Low</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, i) => (
                    <tr key={row.symbol} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-3 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-900">{row.symbol}</td>
                      <td className="px-3 py-2.5 text-right text-gray-700">₹{fmt(row.ltp)}</td>
                      <td className="px-3 py-2.5 text-right"><PctBadge v={row.changePct} /></td>
                      <td className="px-3 py-2.5 text-right text-gray-600">{fmt(row.volume, 0)}</td>
                      <td className="px-3 py-2.5 text-right"><PctBadge v={row.perChange365d} /></td>
                      <td className="px-3 py-2.5 text-right text-gray-500">
                        {row.week52High != null ? `₹${fmt(row.week52High)}` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-500">
                        {row.week52Low != null ? `₹${fmt(row.week52Low)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

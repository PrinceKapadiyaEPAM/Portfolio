'use client';
import { useState, useEffect, useCallback } from 'react';
import { fetchPortfolio, addHolding, deleteHolding, sellHolding } from '@/lib/portfolio-api';
import type { Holding, PortfolioSummary } from '@/lib/portfolio-api';

function fmt(n: number | null, decimals = 2) {
  if (n == null) return '—';
  return n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function PnlCell({ v, pct }: { v: number | null; pct: number | null }) {
  if (v == null) return <span className="text-gray-400">—</span>;
  const pos = v >= 0;
  return (
    <span className={pos ? 'text-green-600' : 'text-red-600'}>
      {pos ? '+' : ''}{fmt(v)}
      {pct != null && <span className="text-xs ml-1 opacity-75">({pos ? '+' : ''}{pct.toFixed(2)}%)</span>}
    </span>
  );
}

function SummaryCard({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-5 py-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${className ?? 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

const emptyForm = { symbol: '', qty: '', avgBuyPrice: '', buyDate: '', notes: '' };

export default function PortfolioPage() {
  const [holdings, setHoldings]   = useState<Holding[]>([]);
  const [summary, setSummary]     = useState<PortfolioSummary | null>(null);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sellTarget, setSellTarget] = useState<Holding | null>(null);
  const [sellForm, setSellForm] = useState({ qty: '', price: '', charges: '', notes: '' });
  const [selling, setSelling] = useState(false);
  const [sellError, setSellError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const p = await fetchPortfolio();
      setHoldings(p.holdings);
      setSummary(p.summary);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await addHolding({
        symbol:      form.symbol.trim().toUpperCase(),
        qty:         Number(form.qty),
        avgBuyPrice: Number(form.avgBuyPrice),
        buyDate:     form.buyDate,
        notes:       form.notes || undefined,
      });
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.error?.message ?? 'Failed to add holding');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteHolding(id);
    await load();
  }

  const pnlColor = summary && summary.totalPnl >= 0 ? 'text-green-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portfolio</h1>
          <p className="text-sm text-gray-500 mt-0.5">Holdings with live P&amp;L</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Add Holding'}
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label="Invested"      value={`₹${fmt(summary.totalInvested)}`} />
          <SummaryCard label="Current Value" value={`₹${fmt(summary.totalCurrentValue)}`} />
          <SummaryCard
            label="Total P&L"
            value={`${summary.totalPnl >= 0 ? '+' : ''}₹${fmt(summary.totalPnl)}`}
            className={pnlColor}
          />
          <SummaryCard
            label="Return"
            value={`${summary.totalPnlPct >= 0 ? '+' : ''}${summary.totalPnlPct.toFixed(2)}%`}
            className={pnlColor}
          />
        </div>
      )}

      {/* Add holding form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Add Holding</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Symbol', key: 'symbol', placeholder: 'RELIANCE', type: 'text' },
              { label: 'Quantity', key: 'qty', placeholder: '10', type: 'number' },
              { label: 'Avg Buy Price (₹)', key: 'avgBuyPrice', placeholder: '2500.00', type: 'number' },
              { label: 'Buy Date', key: 'buyDate', placeholder: '', type: 'date' },
              { label: 'Notes (optional)', key: 'notes', placeholder: '', type: 'text' },
            ].map(({ label, key, placeholder, type }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input
                  type={type}
                  step={key === 'avgBuyPrice' ? '0.01' : undefined}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  required={key !== 'notes'}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
          {formError && <p className="text-xs text-red-600">{formError}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save Holding'}
          </button>
        </form>
      )}

      {/* Holdings table */}
      {loading ? (
        <div className="animate-pulse space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded" />)}
        </div>
      ) : holdings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No holdings yet.</p>
          <p className="text-xs mt-1">Click &quot;Add Holding&quot; to get started.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Symbol', 'Qty', 'Avg Buy', 'LTP', 'Invested', 'Current', 'Realized', 'P&L', ''].map((h) => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === 'Symbol' || h === '' ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">{h.symbol}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmt(h.qty, 0)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">₹{fmt(h.avgBuyPrice)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{h.ltp != null ? `₹${fmt(h.ltp)}` : '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-600">₹{fmt(h.invested)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{h.currentValue != null ? `₹${fmt(h.currentValue)}` : '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{h.realizedPnl != null ? `₹${fmt(h.realizedPnl)}` : '—'}</td>
                      <td className="px-4 py-3 text-right"><PnlCell v={h.pnl} pct={h.pnlPct} /></td>
                  <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button onClick={() => {
                            setSellTarget(h);
                            setSellForm({
                              qty: '',
                              price: String(h.ltp != null ? h.ltp : h.avgBuyPrice),
                              charges: '',
                              notes: '',
                            });
                            setSellError(null);
                          }} className="text-xs text-blue-600 hover:text-blue-800">Sell</button>
                          <button onClick={() => handleDelete(h.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                        </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
          {/* Sell Modal */}
          {sellTarget && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-lg w-full max-w-md p-5 shadow-xl">
                <h3 className="text-lg font-semibold">Sell {sellTarget.symbol}</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setSellError(null);
                  const qty = Number(sellForm.qty);
                  const price = Number(sellForm.price);
                  if (isNaN(qty) || qty <= 0) {
                    setSellError('Enter a valid quantity');
                    return;
                  }
                  if (qty > (sellTarget?.qty ?? 0)) {
                    setSellError('Sell quantity cannot exceed holding quantity');
                    return;
                  }
                  if (isNaN(price) || price <= 0) {
                    setSellError('Enter a valid price');
                    return;
                  }

                  setSelling(true);
                  try {
                    await sellHolding(sellTarget.id, {
                      qty,
                      price,
                      charges: sellForm.charges ? Number(sellForm.charges) : undefined,
                      notes: sellForm.notes || undefined,
                    });
                    setSellTarget(null);
                    setSellForm({ qty: '', price: '', charges: '', notes: '' });
                    await load();
                  } catch (err: any) {
                    const msg = err?.response?.data?.error?.message ?? err?.response?.data?.message ?? err?.message ?? 'Sell failed';
                    setSellError(String(msg));
                  } finally {
                    setSelling(false);
                  }
                }}>
                  <div className="space-y-3 mt-3">
                    <div>
                      <label className="block text-xs text-gray-600">Quantity</label>
                      <div className="text-[10px] text-gray-500 mb-1">Available: {sellTarget.qty}</div>
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        max={sellTarget.qty}
                        value={sellForm.qty}
                        onChange={(e) => setSellForm((s) => ({ ...s, qty: e.target.value }))}
                        required
                        placeholder="Enter qty to sell"
                        className="w-full border px-3 py-2 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={sellForm.price}
                        onChange={(e) => setSellForm((s) => ({ ...s, price: e.target.value }))}
                        required
                        className="w-full border px-3 py-2 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Charges (optional)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={sellForm.charges}
                        onChange={(e) => setSellForm((s) => ({ ...s, charges: e.target.value }))}
                        className="w-full border px-3 py-2 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Notes (optional)</label>
                      <input value={sellForm.notes} onChange={(e) => setSellForm((s) => ({ ...s, notes: e.target.value }))} className="w-full border px-3 py-2 rounded text-sm" />
                    </div>
                    {sellError && <p className="text-xs text-red-600">{sellError}</p>}
                    <div className="flex items-center justify-end space-x-2">
                      <button type="button" onClick={() => { setSellTarget(null); setSellError(null); }} className="px-3 py-2 border rounded text-sm">Cancel</button>
                      <button type="submit" disabled={selling} className="px-3 py-2 bg-red-600 text-white rounded text-sm">{selling ? 'Selling…' : 'Confirm Sell'}</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
    </div>
  );
}

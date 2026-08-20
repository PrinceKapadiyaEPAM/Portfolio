'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchAllTransactions, deleteTransaction } from '@/lib/strategy-api';
import Modal from '@/components/ui/Modal';

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [symbol, setSymbol]     = useState('');
  const [side, setSide]         = useState('');
  const [txnType, setTxnType]   = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; txnRef: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchAllTransactions({
        symbol:   symbol.trim() || undefined,
        side:     side || undefined,
        txnType:  txnType || undefined,
        dateFrom: dateFrom || undefined,
        dateTo:   dateTo || undefined,
      });
      setTransactions(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [symbol, side, txnType, dateFrom, dateTo]);

  async function handleDelete(id: string, txnRef: string) {
    // open confirmation modal instead of using browser confirm
    setDeleteTarget({ id, txnRef });
    setConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTransaction(deleteTarget.id);
      setTransactions((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-sm text-gray-500 mt-0.5">All recorded trade transactions</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Symbol</label>
          <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="All" className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-32" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Side</label>
          <select value={side} onChange={(e) => setSide(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All</option>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <select value={txnType} onChange={(e) => setTxnType(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All</option>
            <option value="ACCUMULATION">Accumulation</option>
            <option value="TARGET">Target</option>
            <option value="STOP_LOSS">Stop Loss</option>
            <option value="MANUAL">Manual</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-200 rounded" />)}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No transactions found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ref</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trade</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Symbol</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Side</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Price</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">P&L</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Charges</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 text-xs">{new Date(t.executedAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{t.txnRef}</td>
                  <td className="px-4 py-3 text-xs">
                    {t.tradeSetup ? (
                      <Link href={`/trades/${t.tradeSetupId}`} className="text-blue-600 hover:text-blue-800">
                        <span className="font-mono">{t.tradeSetup.tradeId}</span>
                        <span className="text-gray-500 ml-1">({t.tradeSetup.name})</span>
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{t.symbol}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold ${t.side === 'BUY' ? 'text-green-600' : 'text-red-600'}`}>{t.side}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmt(t.qty)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">₹{fmt(t.price)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{t.txnType.toLowerCase().replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-right">
                    {t.pnl != null
                      ? <span className={t.pnl >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{t.pnl >= 0 ? '+' : ''}₹{fmt(t.pnl)}</span>
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">{Number(t.charges) > 0 ? `₹${fmt(t.charges)}` : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(t.id, t.txnRef)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/** Confirmation modal for delete */}
      <Modal title="Confirm delete" open={confirmOpen} onClose={() => { setConfirmOpen(false); setDeleteTarget(null); }}>
        <div className="space-y-3">
          <p className="text-sm text-gray-700">Delete transaction <span className="font-mono">{deleteTarget?.txnRef}</span>? This will reverse portfolio changes and cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setConfirmOpen(false); setDeleteTarget(null); }} className="px-3 py-1 bg-white border rounded">Cancel</button>
            <button onClick={confirmDelete} disabled={deleting} className="px-3 py-1 bg-red-600 text-white rounded">{deleting ? 'Deleting...' : 'Delete'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

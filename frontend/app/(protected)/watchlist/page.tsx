'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  fetchWatchlists,
  fetchWatchlistsMeta,
  fetchWatchlist,
  createWatchlist,
  renameWatchlist,
  deleteWatchlist,
  addWatchlistItem,
  removeWatchlistItem,
} from '@/lib/watchlist-api';
import type { Watchlist, WatchlistItem } from '@/lib/watchlist-api';
import Modal from '@/components/ui/Modal';
import WatchlistForm from '@/components/watchlist/WatchlistForm';

function fmt(n: number | null) {
  if (n == null) return '—';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PctCell({ v }: { v: number | null }) {
  if (v == null) return <span className="text-gray-400">—</span>;
  const pos = v >= 0;
  return (
    <span className={pos ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
      {pos ? '+' : ''}{v.toFixed(2)}%
    </span>
  );
}

export default function WatchlistPage() {
  const [lists, setLists]       = useState<Watchlist[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems]       = useState<WatchlistItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [symbol, setSymbol]     = useState('');
  const [adding, setAdding]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'rename' | null>(null);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);

  const loadLists = useCallback(async () => {
    try {
      const all = await fetchWatchlistsMeta();
      setLists(all);
      if (all.length > 0 && !selectedId) setSelectedId(all[0].id);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const loadSelected = useCallback(async (id: string | null) => {
    if (!id) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const wl = await fetchWatchlist(id);
      setItems(wl.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLists(); }, [loadLists]);
  useEffect(() => { if (selectedId) loadSelected(selectedId); }, [selectedId, loadSelected]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;
    setAdding(true);
    setError(null);
    try {
      if (!selectedId) throw new Error('No watchlist selected');
      await addWatchlistItem(selectedId, sym);
      setSymbol('');
      await loadSelected(selectedId);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? err?.message ?? 'Failed to add symbol');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(sym: string) {
    try {
      if (!selectedId) return;
      await removeWatchlistItem(selectedId, sym);
      setItems((prev) => prev.filter((i) => i.symbol !== sym));
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Watchlists</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage multiple named watchlists and track stocks with live prices</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-2 overflow-x-auto">
            {lists.map((l) => (
              <div key={l.id} className={`flex items-center gap-2 px-3 py-1 rounded-md cursor-pointer ${selectedId === l.id ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-gray-200'}`} onClick={() => setSelectedId(l.id)}>
                <span className="text-sm font-medium">{l.name ?? 'Untitled'}</span>
                <button
                  onClick={async (e) => { e.stopPropagation(); setRenameTarget(l.id); setModalMode('rename'); setModalOpen(true); }}
                  title="Rename"
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 3l5 5L8 21H3v-5L16 3z" />
                  </svg>
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!confirm('Delete this watchlist? This cannot be undone.')) return;
                    await deleteWatchlist(l.id);
                    setLists((prev) => prev.filter(x => x.id !== l.id));
                    setSelectedId((prev) => {
                      if (prev === l.id) {
                        const remaining = lists.filter(x => x.id !== l.id);
                        return remaining.length ? remaining[0].id : null;
                      }
                      return prev;
                    });
                  }}
                  title="Delete"
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <button onClick={() => { setModalMode('create'); setModalOpen(true); }} className="flex items-center px-3 py-1 rounded-md bg-white border border-dashed border-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <Modal title={modalMode === 'create' ? 'Create Watchlist' : 'Rename Watchlist'} open={modalOpen} onClose={() => setModalOpen(false)}>
        {modalMode === 'create' ? (
          <WatchlistForm
            onCancel={() => setModalOpen(false)}
            onSubmit={async (name) => {
              const created = await createWatchlist(name);
              setLists((prev) => [...prev, created]);
              setSelectedId(created.id);
              setModalOpen(false);
            }}
            submitLabel="Create"
          />
        ) : (
          <WatchlistForm
            initialName={lists.find(l => l.id === renameTarget)?.name ?? ''}
            onCancel={() => setModalOpen(false)}
            onSubmit={async (name) => {
              if (!renameTarget) return;
              const updated = await renameWatchlist(renameTarget, name);
              setLists((prev) => prev.map(l => l.id === updated.id ? updated : l));
              setModalOpen(false);
            }}
            submitLabel="Rename"
          />
        )}
      </Modal>

      {/* Add symbol form */}
      <form onSubmit={handleAdd} className="flex gap-2 items-start">
        <div className="flex-1 max-w-xs">
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="Symbol e.g. RELIANCE"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={adding || !symbol.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {adding ? 'Adding…' : 'Add'}
        </button>
      </form>

      {/* Table */}
      {loading ? (
        <div className="animate-pulse space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">Your watchlist is empty.</p>
          <p className="text-xs mt-1">Add a symbol above to get started.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Symbol</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">LTP</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Change</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Chg%</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.symbol} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">{item.symbol}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmt(item.ltp)}</td>
                  <td className={`px-4 py-3 text-right ${item.change != null && item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.change != null ? (item.change >= 0 ? '+' : '') + fmt(item.change) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right"><PctCell v={item.changePct} /></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRemove(item.symbol)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

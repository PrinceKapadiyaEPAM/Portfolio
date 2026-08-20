import api from './api';

export interface WatchlistItem {
  symbol: string;
  notes: string | null;
  addedAt: string;
  ltp: number | null;
  change: number | null;
  changePct: number | null;
}

export interface Watchlist {
  id: string;
  name?: string;
  items: WatchlistItem[];
}

export async function fetchWatchlists(): Promise<Watchlist[]> {
  const { data } = await api.get<Watchlist[]>('/watchlist');
  return data;
}

export async function fetchWatchlistsMeta(): Promise<Watchlist[]> {
  const { data } = await api.get<Watchlist[]>('/watchlist', { params: { noPrices: true } });
  return data;
}

export async function fetchWatchlist(id: string): Promise<Watchlist> {
  const { data } = await api.get<Watchlist>(`/watchlist/${id}`);
  return data;
}

export async function createWatchlist(name: string): Promise<Watchlist> {
  const { data } = await api.post<Watchlist>('/watchlist', { name });
  return data;
}

export async function renameWatchlist(id: string, name: string): Promise<Watchlist> {
  const { data } = await api.patch<Watchlist>(`/watchlist/${id}`, { name });
  return data;
}

export async function deleteWatchlist(id: string): Promise<void> {
  await api.delete(`/watchlist/${id}`);
}

export async function addWatchlistItem(watchlistId: string, symbol: string, notes?: string): Promise<void> {
  await api.post(`/watchlist/${watchlistId}/items`, { symbol, notes });
}

export async function removeWatchlistItem(watchlistId: string, symbol: string): Promise<void> {
  await api.delete(`/watchlist/${watchlistId}/items/${symbol}`);
}

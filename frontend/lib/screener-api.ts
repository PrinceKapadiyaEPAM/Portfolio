import api from './api';

export interface ScreenerFilters {
  change_gt?: number;
  change_lt?: number;
  volume_gt?: number;
  volume_lt?: number;
  per_change_365d_gt?: number;
  per_change_365d_lt?: number;
  sort_by?: 'changePct' | 'volume' | 'ltp' | 'perChange365d';
  sort_order?: 'asc' | 'desc';
  limit?: number;
}

export interface ScreenerRow {
  symbol: string;
  ltp: number;
  changePct: number;
  volume: number;
  week52High: number | null;
  week52Low: number | null;
  perChange365d: number | null;
  snappedAt: string;
}

export interface ScreenerMeta {
  snappedAt: string | null;
  count: number;
}

export interface ScreenerResult {
  results: ScreenerRow[];
  meta: ScreenerMeta;
}

export interface ScreenerPreset {
  id: string;
  name: string;
  filters: ScreenerFilters;
  createdAt: string;
}

export async function runScreener(filters: ScreenerFilters): Promise<ScreenerResult> {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
  );
  const { data } = await api.get<ScreenerResult>('/screener/results', { params });
  return data;
}

export async function fetchPresets(): Promise<ScreenerPreset[]> {
  const { data } = await api.get<ScreenerPreset[]>('/screener/presets');
  return data;
}

export async function savePreset(name: string, filters: ScreenerFilters): Promise<ScreenerPreset> {
  const { data } = await api.post<ScreenerPreset>('/screener/presets', { name, filters });
  return data;
}

export async function deletePreset(id: string): Promise<void> {
  await api.delete(`/screener/presets/${id}`);
}

export interface SymbolSuggestion {
  symbol: string;
  ltp: number;
}

export async function searchSymbols(q: string): Promise<SymbolSuggestion[]> {
  const { data } = await api.get<SymbolSuggestion[]>('/screener/symbols', { params: { q } });
  return data;
}

import api from './api';
import type { MarketResponse, MarketStatus, IndexQuote, Movers } from '@/types/market';

export async function fetchMarketStatus(): Promise<MarketResponse<MarketStatus>> {
  const { data } = await api.get<MarketResponse<MarketStatus>>('/market/status');
  return data;
}

export async function fetchIndices(): Promise<MarketResponse<IndexQuote[]>> {
  const { data } = await api.get<MarketResponse<IndexQuote[]>>('/market/indices');
  return data;
}

export async function fetchMovers(): Promise<MarketResponse<Movers>> {
  const { data } = await api.get<MarketResponse<Movers>>('/market/movers');
  return data;
}

export async function clearMarketCache(): Promise<{ cleared: boolean; source: 'memory' | 'redis' }> {
  const { data } = await api.delete<{ cleared: boolean; source: 'memory' | 'redis' }>('/market/cache');
  return data;
}

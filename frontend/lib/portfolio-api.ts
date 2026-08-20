import api from './api';

export interface Holding {
  id: string;
  symbol: string;
  qty: number;
  avgBuyPrice: number;
  buyDate: string;
  notes: string | null;
  tags?: string[];
  realizedPnl?: number;
  ltp: number | null;
  changePct: number | null;
  invested: number;
  currentValue: number | null;
  pnl: number | null;
  pnlPct: number | null;
}

export interface PortfolioSummary {
  totalInvested: number;
  totalCurrentValue: number;
  totalPnl: number;
  totalPnlPct: number;
}

export interface Portfolio {
  id: string;
  holdings: Holding[];
  summary: PortfolioSummary;
}

export async function fetchPortfolio(): Promise<Portfolio> {
  const { data } = await api.get<Portfolio>('/portfolio');
  return data;
}

export async function addHolding(payload: {
  symbol: string;
  qty: number;
  avgBuyPrice: number;
  buyDate: string;
  notes?: string;
  tags?: string[];
}): Promise<void> {
  await api.post('/portfolio/holdings', payload);
}

export async function sellHolding(id: string, payload: {
  qty: number;
  price: number;
  charges?: number;
  notes?: string;
}): Promise<{ id: string; qty: number; price: number; charges: number; pnl: number }> {
  const { data } = await api.post(`/portfolio/holdings/${id}/sell`, payload);
  return data;
}

export async function updateHolding(id: string, payload: Partial<{
  qty: number;
  avgBuyPrice: number;
  buyDate: string;
  notes: string;
}>): Promise<void> {
  await api.patch(`/portfolio/holdings/${id}`, payload);
}

export async function deleteHolding(id: string): Promise<void> {
  await api.delete(`/portfolio/holdings/${id}`);
}

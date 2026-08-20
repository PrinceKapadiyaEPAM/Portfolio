import api from './api';

export interface AccumulationLevel {
  id: string;
  tradeSetupId: string;
  levelNum: number;
  triggerPrice: number;
  plannedQty: number;
  executedQty: number;
  executedPrice: number | null;
  status: string;
  executedAt: string | null;
}

export interface TradeTarget {
  id: string;
  tradeSetupId: string;
  levelNum: number;
  targetPrice: number;
  plannedQty: number | null;
  plannedPct: number | null;
  executedQty: number;
  executedPrice: number | null;
  status: string;
  executedAt: string | null;
}

export interface TradeTransaction {
  id: string;
  tradeSetupId: string;
  txnRef: string;
  symbol: string;
  side: string;
  qty: number;
  price: number;
  executedAt: string;
  txnType: string;
  charges: number;
  pnl: number | null;
  notes: string | null;
  accumulationLevelId: string | null;
  targetId: string | null;
}

export interface Trade {
  id: string;
  tradeId: string;
  name: string;
  description?: string | null;
  tags: string[];
  symbol: string;
  buyRangeHigh: number;
  buyRangeLow: number;
  status: string;
  slType: string | null;
  slValue: number | null;
  slReference: string | null;
  slStatus: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  accLevels: AccumulationLevel[];
  targets: TradeTarget[];
  transactions: TradeTransaction[];
  // computed
  plannedQty: number;
  purchasedQty: number;
  soldQty: number;
  currentQty: number;
  avgCost: number | null;
  totalInvested: number;
  realizedPnl: number;
  ltp?: number | null;
  unrealizedPnl?: number | null;
  nextLevel: AccumulationLevel | null;
  nextTarget: TradeTarget | null;
}

// Trades API
export async function createTrade(payload: {
  name: string; description?: string; tags?: string[]; symbol: string;
  buyRangeHigh: number; buyRangeLow: number; levelCount: number; defaultQtyPerLevel: number;
  slType?: string; slValue?: number; slReference?: string; notes?: string;
}): Promise<Trade> {
  const { data } = await api.post<Trade>('/trades', payload);
  return data;
}

export async function fetchTrades(filters?: { status?: string; symbol?: string; tags?: string[] }): Promise<Trade[]> {
  const { data } = await api.get<Trade[]>('/trades', { params: filters });
  return data;
}

export async function fetchTrade(id: string): Promise<Trade> {
  const { data } = await api.get<Trade>(`/trades/${id}`);
  return data;
}

export async function updateTrade(id: string, payload: Partial<{
  name: string; description: string; tags: string[]; status: string;
  slType: string; slValue: number; slReference: string; slStatus: string; notes: string;
}>): Promise<Trade> {
  const { data } = await api.patch<Trade>(`/trades/${id}`, payload);
  return data;
}

export async function deleteTrade(id: string): Promise<void> {
  await api.delete(`/trades/${id}`);
}

export async function saveLevels(tradeId: string, levels: { levelNum: number; triggerPrice: number; plannedQty: number }[]): Promise<AccumulationLevel[]> {
  const { data } = await api.put<AccumulationLevel[]>(`/trades/${tradeId}/levels`, { levels });
  return data;
}

export async function saveTargets(tradeId: string, targets: { levelNum: number; targetPrice: number; plannedQty?: number; plannedPct?: number }[]): Promise<TradeTarget[]> {
  const { data } = await api.put<TradeTarget[]>(`/trades/${tradeId}/targets`, { targets });
  return data;
}

export async function updateLevel(tradeId: string, levelId: string, payload: Partial<{
  status: string; executedPrice: number; executedQty: number; executedAt: string;
}>): Promise<AccumulationLevel> {
  const { data } = await api.patch<AccumulationLevel>(`/trades/${tradeId}/levels/${levelId}`, payload);
  return data;
}

// Transactions API
export async function recordTransaction(tradeId: string, payload: {
  side: string; qty: number; price: number; executedAt: string; txnType: string;
  accumulationLevelId?: string; targetId?: string; charges?: number; notes?: string;
}): Promise<TradeTransaction> {
  const { data } = await api.post<TradeTransaction>(`/trades/${tradeId}/transactions`, payload);
  return data;
}

export async function fetchTradeTransactions(tradeId: string): Promise<TradeTransaction[]> {
  const { data } = await api.get<TradeTransaction[]>(`/trades/${tradeId}/transactions`);
  return data;
}

export async function fetchAllTransactions(filters?: {
  symbol?: string; side?: string; txnType?: string; dateFrom?: string; dateTo?: string;
}): Promise<(TradeTransaction & { tradeSetup: { tradeId: string; name: string; symbol: string } | null })[]> {
  const { data } = await api.get('/transactions', { params: filters });
  return data;
}

export async function deleteTransaction(txnId: string): Promise<void> {
  await api.delete(`/transactions/${txnId}`);
}

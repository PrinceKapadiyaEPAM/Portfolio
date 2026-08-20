export type MarketPhase = 'open' | 'pre-open' | 'closed' | 'weekend';

export interface MarketStatus {
  phase: MarketPhase;
  isOpen: boolean;
  nextEvent: string;
  nextEventAt: string;
  nextEventInMinutes: number;
  indices: Array<{ index: string; marketState: string }>;
}

export interface IndexQuote {
  symbol: string;
  ltp: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  change: number;
  changePct: number;
}

export interface Mover {
  symbol: string;
  ltp: number;
  change: number;
  changePct: number;
  volume: number;
}

export interface Movers {
  gainers: Mover[];
  losers: Mover[];
}

export interface MarketMeta {
  cached: boolean;
  stale: boolean;
  isLastClose: boolean;
  asOf: string | null;
  marketPhase: MarketPhase;
}

export interface MarketResponse<T> {
  data: T | null;
  meta: MarketMeta;
}

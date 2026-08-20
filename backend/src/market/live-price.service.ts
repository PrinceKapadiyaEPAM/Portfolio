import { Injectable, Logger } from '@nestjs/common';
import { NseClientService } from './nse/nse-client.service';
import { CacheService } from './cache/cache.service';
import { CacheKeys, CacheTTL } from './cache/cache-keys.constant';

export interface LiveQuote {
  ltp: number;
  change: number;
  changePct: number;
}

@Injectable()
export class LivePriceService {
  private readonly logger = new Logger(LivePriceService.name);

  constructor(
    private readonly nse: NseClientService,
    private readonly cache: CacheService,
  ) {}

  async getQuote(symbol: string): Promise<LiveQuote | null> {
    const cached = await this.cache.get<LiveQuote>(CacheKeys.equityQuote(symbol));
    if (cached) return cached;

    const data = await this.nse.fetchEquityQuote(symbol);
    if (!data) return null;

    const priceInfo = (data as any).priceInfo ?? {};
    const quote: LiveQuote = {
      ltp:       priceInfo.lastPrice     ?? 0,
      change:    priceInfo.change        ?? 0,
      changePct: priceInfo.pChange       ?? 0,
    };

    await this.cache.set(CacheKeys.equityQuote(symbol), quote, CacheTTL.EQUITY_QUOTE);
    return quote;
  }

  async getQuotes(symbols: string[]): Promise<Map<string, LiveQuote>> {
    // First try to read from cache concurrently
    const results = await Promise.all(symbols.map((s) => this.cache.get<LiveQuote>(CacheKeys.equityQuote(s))));
    const map = new Map<string, LiveQuote>();
    const missing: string[] = [];
    for (let i = 0; i < symbols.length; i++) {
      const sym = symbols[i];
      const q = results[i];
      if (q) map.set(sym, q);
      else missing.push(sym);
    }

    if (missing.length === 0) return map;

    // Fetch missing symbols with limited concurrency to avoid hammering NSE
    const concurrency = 5;
    const chunks: string[][] = [];
    for (let i = 0; i < missing.length; i += concurrency) chunks.push(missing.slice(i, i + concurrency));

    for (const chunk of chunks) {
      const fetched = await Promise.all(chunk.map((sym) => this.getQuote(sym).catch(() => null)));
      for (let i = 0; i < chunk.length; i++) {
        const sym = chunk[i];
        const q = fetched[i];
        if (q) map.set(sym, q);
      }
    }

    return map;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { NseClientService } from '../nse/nse-client.service';
import { CacheService } from '../cache/cache.service';
import { CacheKeys, CacheTTL } from '../cache/cache-keys.constant';

@Injectable()
export class GainersLosersPoller {
  private readonly logger = new Logger(GainersLosersPoller.name);

  constructor(
    private readonly nse: NseClientService,
    private readonly cache: CacheService,
  ) {}

  async poll(): Promise<void> {
    const data = await this.nse.fetchAllStocks();
    if (!data) return;

    const rows: any[] = (data as any)?.data ?? [];
    if (rows.length === 0) return;

    const stocks = rows
      .map((row: any) => {
        const m = row?.metadata ?? {};
        const symbol = (m.symbol as string | undefined)?.trim().toUpperCase();
        if (!symbol || m.lastPrice == null || m.pChange == null) return null;
        return {
          symbol,
          ltp:       m.lastPrice as number,
          change:    (m.change ?? 0) as number,
          changePct: m.pChange as number,
          volume:    row?.detail?.preOpenMarket?.totalTradedVolume ?? 0,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    const gainers = [...stocks].sort((a, b) => b.changePct - a.changePct).slice(0, 10);
    const losers  = [...stocks].sort((a, b) => a.changePct - b.changePct).slice(0, 10);

    await Promise.all([
      this.cache.set(CacheKeys.topGainers(), gainers, CacheTTL.MOVERS),
      this.cache.set(CacheKeys.topLosers(), losers, CacheTTL.MOVERS),
      this.cache.set(CacheKeys.pollTimestamp('gainers-losers'), Date.now(), CacheTTL.POLL_TIMESTAMP),
      // Last-close snapshot — persists 24 h
      this.cache.set(CacheKeys.topGainersLastClose(), gainers, CacheTTL.LAST_CLOSE),
      this.cache.set(CacheKeys.topLosersLastClose(), losers, CacheTTL.LAST_CLOSE),
      this.cache.set(CacheKeys.pollTimestampLastClose('gainers-losers'), Date.now(), CacheTTL.LAST_CLOSE),
    ]);

    this.logger.log(`Gainers/losers updated — ${gainers.length} gainers, ${losers.length} losers from ${stocks.length} stocks`);
  }
}

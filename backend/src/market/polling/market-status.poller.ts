import { Injectable } from '@nestjs/common';
import { NseClientService } from '../nse/nse-client.service';
import { CacheService } from '../cache/cache.service';
import { MarketHoursService } from '../market-hours/market-hours.service';
import { CacheKeys, CacheTTL } from '../cache/cache-keys.constant';

@Injectable()
export class MarketStatusPoller {
  constructor(
    private readonly nse: NseClientService,
    private readonly cache: CacheService,
    private readonly marketHours: MarketHoursService,
  ) {}

  async poll(): Promise<void> {
    const phase = this.marketHours.marketPhase();
    const next = this.marketHours.nextTransition();

    // Try to get live status from NSE; fall back to local calculation.
    const raw = await this.nse.fetchMarketStatus();
    const marketState = (raw as any)?.marketState ?? [];

    const dto = {
      phase,
      isOpen: this.marketHours.isMarketOpen(),
      nextEvent: next.event,
      nextEventAt: next.at,
      nextEventInMinutes: next.inMinutes,
      indices: marketState.slice(0, 5).map((m: any) => ({
        index:       m.index ?? '',
        marketState: m.marketState ?? '',
      })),
    };

    await this.cache.set(CacheKeys.marketStatus(), dto, CacheTTL.MARKET_STATUS);
    await this.cache.set(CacheKeys.pollTimestamp('market-status'), Date.now(), CacheTTL.POLL_TIMESTAMP);
  }
}

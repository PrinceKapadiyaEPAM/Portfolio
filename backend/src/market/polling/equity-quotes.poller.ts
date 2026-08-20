import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NseClientService } from '../nse/nse-client.service';
import { CacheService } from '../cache/cache.service';
import { CacheKeys, CacheTTL } from '../cache/cache-keys.constant';

@Injectable()
export class EquityQuotesPoller {
  private readonly logger = new Logger(EquityQuotesPoller.name);

  constructor(
    private readonly nse: NseClientService,
    private readonly cache: CacheService,
    private readonly config: ConfigService,
  ) {}

  async poll(): Promise<void> {
    const symbols = (this.config.get<string>('NSE_WATCH_SYMBOLS') ?? '')
      .split(',').map((s) => s.trim()).filter(Boolean);

    const results = await Promise.allSettled(
      symbols.map((sym) => this.fetchAndCache(sym)),
    );

    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) this.logger.warn(`${failed}/${symbols.length} equity quote fetches failed`);

    await this.cache.set(CacheKeys.pollTimestamp('equity-quotes'), Date.now(), CacheTTL.POLL_TIMESTAMP);
  }

  private async fetchAndCache(symbol: string): Promise<void> {
    const data = await this.nse.fetchEquityQuote(symbol);
    if (!data) return;

    const info = (data as any).info ?? {};
    const priceInfo = (data as any).priceInfo ?? {};

    const dto = {
      symbol,
      companyName:       info.companyName ?? symbol,
      ltp:               priceInfo.lastPrice ?? 0,
      open:              priceInfo.open ?? 0,
      high:              priceInfo.intraDayHighLow?.max ?? 0,
      low:               priceInfo.intraDayHighLow?.min ?? 0,
      prevClose:         priceInfo.previousClose ?? 0,
      change:            priceInfo.change ?? 0,
      changePct:         priceInfo.pChange ?? 0,
      volume:            (data as any).securityWiseDP?.quantityTraded ?? 0,
      totalTradedValue:  priceInfo.totalTradedValue ?? 0,
    };

    await this.cache.set(CacheKeys.equityQuote(symbol), dto, CacheTTL.EQUITY_QUOTE);
  }
}

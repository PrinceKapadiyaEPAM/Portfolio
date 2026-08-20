import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NseClientService } from '../nse/nse-client.service';
import { CacheService } from '../cache/cache.service';
import { CacheKeys, CacheTTL } from '../cache/cache-keys.constant';

@Injectable()
export class OptionsChainPoller {
  private readonly logger = new Logger(OptionsChainPoller.name);

  constructor(
    private readonly nse: NseClientService,
    private readonly cache: CacheService,
    private readonly config: ConfigService,
  ) {}

  async poll(): Promise<void> {
    const symbols = (this.config.get<string>('NSE_OPTION_SYMBOLS') ?? 'NIFTY,BANKNIFTY')
      .split(',').map((s) => s.trim()).filter(Boolean);

    await Promise.allSettled(symbols.map((sym) => this.fetchAndCache(sym)));
    await this.cache.set(CacheKeys.pollTimestamp('options-chain'), Date.now(), CacheTTL.POLL_TIMESTAMP);
  }

  private async fetchAndCache(symbol: string): Promise<void> {
    const data = await this.nse.fetchIndexOptionChain(symbol);
    if (!data) return;

    const records = (data as any)?.records ?? {};
    const dto = {
      symbol,
      underlyingValue: records.underlyingValue ?? 0,
      expiryDates:     records.expiryDates ?? [],
      records:         (records.data ?? []).slice(0, 50), // cap payload size
    };

    await this.cache.set(CacheKeys.optionsChain(symbol), dto, CacheTTL.OPTIONS_CHAIN);
  }
}

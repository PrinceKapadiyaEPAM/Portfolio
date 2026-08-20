import { Injectable, Logger } from '@nestjs/common';
import { NseClientService } from '../nse/nse-client.service';
import { CacheService } from '../cache/cache.service';
import { CacheKeys, CacheTTL } from '../cache/cache-keys.constant';

const TRACKED_INDICES = ['NIFTY 50', 'NIFTY BANK', 'NIFTY IT', 'NIFTY NEXT 50', 'INDIA VIX'];

const normalizeIndexName = (value: string): string => value.trim().replace(/\s+/g, ' ').toUpperCase();
const isTrackedIndex = (value: string): boolean =>
  TRACKED_INDICES.some((tracked) => normalizeIndexName(tracked) === normalizeIndexName(value));

@Injectable()
export class IndicesPoller {
  private readonly logger = new Logger(IndicesPoller.name);

  constructor(
    private readonly nse: NseClientService,
    private readonly cache: CacheService,
  ) {}

  async poll(): Promise<void> {
    const data = await this.nse.fetchAllIndices();
    if (!data) return;

    const allIndices = (data as any)?.data ?? [];
    const tracked = allIndices.filter((idx: any) => isTrackedIndex(idx.index ?? ''));

    const dtos = tracked.map((idx: any) => ({
      symbol:    idx.index,
      ltp:       idx.last ?? 0,
      open:      idx.open ?? 0,
      high:      idx.high ?? 0,
      low:       idx.low ?? 0,
      prevClose: idx.previousClose ?? 0,
      change:    idx.variation ?? 0,
      changePct: idx.percentChange ?? 0,
    }));

    await Promise.all([
      ...dtos.map((dto: any) =>
        this.cache.set(CacheKeys.indexQuote(dto.symbol), dto, CacheTTL.INDEX_QUOTE),
      ),
      this.cache.set(CacheKeys.indexQuoteAll(), dtos, CacheTTL.INDEX_QUOTE),
      this.cache.set(CacheKeys.pollTimestamp('indices'), Date.now(), CacheTTL.POLL_TIMESTAMP),
      // Last-close snapshot — persists 24 h so the dashboard can show it after market close
      this.cache.set(CacheKeys.indexQuoteAllLastClose(), dtos, CacheTTL.LAST_CLOSE),
      this.cache.set(CacheKeys.pollTimestampLastClose('indices'), Date.now(), CacheTTL.LAST_CLOSE),
    ]);
  }
}

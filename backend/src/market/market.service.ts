import { Injectable } from '@nestjs/common';
import { CacheService } from './cache/cache.service';
import { MarketHoursService } from './market-hours/market-hours.service';
import { CacheKeys } from './cache/cache-keys.constant';
import { PollingOrchestrator } from './polling/polling.orchestrator';
import type { EquityQuoteDto } from './dto/equity-quote.dto';
import type { IndexQuoteDto } from './dto/index-quote.dto';
import type { MoversDto } from './dto/mover.dto';
import type { MarketStatusDto } from './dto/market-status.dto';

interface ResponseMeta {
  cached: boolean;
  stale: boolean;
  isLastClose: boolean;
  asOf: string | null;
  marketPhase: string;
}

export interface MarketResponse<T> {
  data: T | null;
  meta: ResponseMeta;
}

@Injectable()
export class MarketService {
  constructor(
    private readonly cache: CacheService,
    private readonly marketHours: MarketHoursService,
    private readonly polling: PollingOrchestrator,
  ) {}

  async getMarketStatus(): Promise<MarketResponse<MarketStatusDto>> {
    return this.buildResponse<MarketStatusDto>(
      CacheKeys.marketStatus(),
      CacheKeys.pollTimestamp('market-status'),
    );
  }

  async getAllIndices(): Promise<MarketResponse<IndexQuoteDto[]>> {
    const [data, ts] = await Promise.all([
      this.cache.get<IndexQuoteDto[]>(CacheKeys.indexQuoteAll()),
      this.cache.get<number>(CacheKeys.pollTimestamp('indices')),
    ]);
    if (data !== null) return this.wrap(data, ts);

    const [lcData, lcTs] = await Promise.all([
      this.cache.get<IndexQuoteDto[]>(CacheKeys.indexQuoteAllLastClose()),
      this.cache.get<number>(CacheKeys.pollTimestampLastClose('indices')),
    ]);
    return this.wrap(lcData, lcTs, lcData !== null);
  }

  async getIndex(index: string): Promise<MarketResponse<IndexQuoteDto>> {
    return this.buildResponse<IndexQuoteDto>(
      CacheKeys.indexQuote(index),
      CacheKeys.pollTimestamp('indices'),
    );
  }

  async getAllEquityQuotes(): Promise<MarketResponse<EquityQuoteDto[]>> {
    const data = await this.cache.get<EquityQuoteDto[]>(CacheKeys.equityQuoteAll());
    const ts = await this.cache.get<number>(CacheKeys.pollTimestamp('equity-quotes'));
    return this.wrap(data, ts);
  }

  async getEquityQuote(symbol: string): Promise<MarketResponse<EquityQuoteDto>> {
    return this.buildResponse<EquityQuoteDto>(
      CacheKeys.equityQuote(symbol),
      CacheKeys.pollTimestamp('equity-quotes'),
    );
  }

  async getOptionsChain(symbol: string): Promise<MarketResponse<unknown>> {
    return this.buildResponse<unknown>(
      CacheKeys.optionsChain(symbol),
      CacheKeys.pollTimestamp('options-chain'),
    );
  }

  async getMovers(): Promise<MarketResponse<MoversDto>> {
    const [gainers, losers, ts] = await Promise.all([
      this.cache.get<MoversDto['gainers']>(CacheKeys.topGainers()),
      this.cache.get<MoversDto['losers']>(CacheKeys.topLosers()),
      this.cache.get<number>(CacheKeys.pollTimestamp('gainers-losers')),
    ]);
    const data = gainers && losers ? { gainers, losers } : null;
    if (data !== null) return this.wrap(data, ts);

    const [lcGainers, lcLosers, lcTs] = await Promise.all([
      this.cache.get<MoversDto['gainers']>(CacheKeys.topGainersLastClose()),
      this.cache.get<MoversDto['losers']>(CacheKeys.topLosersLastClose()),
      this.cache.get<number>(CacheKeys.pollTimestampLastClose('gainers-losers')),
    ]);
    const lcData = lcGainers && lcLosers ? { gainers: lcGainers, losers: lcLosers } : null;
    return this.wrap(lcData, lcTs, lcData !== null);
  }

  async clearCache(): Promise<{ cleared: boolean; source: 'memory' | 'redis' }> {
    const result = await this.cache.clearAll();
    if (result.cleared) {
      await this.polling.refreshMarketData();
    }
    return result;
  }

  private async buildResponse<T>(
    dataKey: string,
    tsKey: string,
  ): Promise<MarketResponse<T>> {
    const [data, ts] = await Promise.all([
      this.cache.get<T>(dataKey),
      this.cache.get<number>(tsKey),
    ]);
    return this.wrap(data, ts);
  }

  private wrap<T>(data: T | null, ts: number | null, isLastClose = false): MarketResponse<T> {
    const phase = this.marketHours.marketPhase();
    const staleThresholdMs = 5 * 60 * 1000; // 5 minutes
    const stale = !isLastClose && (ts == null || Date.now() - ts > staleThresholdMs);

    return {
      data,
      meta: {
        cached: data != null,
        stale,
        isLastClose,
        asOf: ts ? new Date(ts).toISOString() : null,
        marketPhase: phase,
      },
    };
  }
}

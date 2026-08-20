import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { NseModule } from '../nse/nse.module';
import { CacheModule } from '../cache/cache.module';
import { MarketHoursModule } from '../market-hours/market-hours.module';
import { PollingOrchestrator } from './polling.orchestrator';
import { EquityQuotesPoller } from './equity-quotes.poller';
import { IndicesPoller } from './indices.poller';
import { OptionsChainPoller } from './options-chain.poller';
import { GainersLosersPoller } from './gainers-losers.poller';
import { MarketStatusPoller } from './market-status.poller';
import { ScreenerSnapshotPoller } from './screener-snapshot.poller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    NseModule,
    CacheModule,
    MarketHoursModule,
  ],
  providers: [
    PollingOrchestrator,
    EquityQuotesPoller,
    IndicesPoller,
    OptionsChainPoller,
    GainersLosersPoller,
    MarketStatusPoller,
    ScreenerSnapshotPoller,
  ],
  exports: [PollingOrchestrator],
})
export class PollingModule {}

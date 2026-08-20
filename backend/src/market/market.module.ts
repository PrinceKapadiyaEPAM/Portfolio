import { Module } from '@nestjs/common';
import { CacheModule } from './cache/cache.module';
import { NseModule } from './nse/nse.module';
import { MarketHoursModule } from './market-hours/market-hours.module';
import { PollingModule } from './polling/polling.module';
import { MarketService } from './market.service';
import { MarketController } from './market.controller';
import { LivePriceService } from './live-price.service';

@Module({
  imports: [CacheModule, NseModule, MarketHoursModule, PollingModule],
  providers: [MarketService, LivePriceService],
  controllers: [MarketController],
  exports: [LivePriceService, CacheModule],
})
export class MarketModule {}

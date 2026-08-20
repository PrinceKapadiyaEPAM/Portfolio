import { Module } from '@nestjs/common';
import { MarketHoursService } from './market-hours.service';

@Module({
  providers: [MarketHoursService],
  exports: [MarketHoursService],
})
export class MarketHoursModule {}

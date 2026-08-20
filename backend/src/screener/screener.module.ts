import { Module } from '@nestjs/common';
import { ScreenerService } from './screener.service';
import { ScreenerController } from './screener.controller';

@Module({
  providers: [ScreenerService],
  controllers: [ScreenerController],
})
export class ScreenerModule {}

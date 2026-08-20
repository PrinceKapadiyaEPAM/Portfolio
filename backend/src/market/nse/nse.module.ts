import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NseClientService } from './nse-client.service';

@Module({
  imports: [ConfigModule],
  providers: [NseClientService],
  exports: [NseClientService],
})
export class NseModule {}

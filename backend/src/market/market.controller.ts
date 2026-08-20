import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MarketService } from './market.service';

@Controller('market')
@UseGuards(JwtAuthGuard)
export class MarketController {
  constructor(private readonly market: MarketService) {}

  @Get('status')
  getStatus() {
    return this.market.getMarketStatus();
  }

  @Delete('cache')
  clearCache() {
    return this.market.clearCache();
  }

  @Get('indices')
  getAllIndices() {
    return this.market.getAllIndices();
  }

  @Get('indices/:index')
  getIndex(@Param('index') index: string) {
    return this.market.getIndex(index.toUpperCase());
  }

  @Get('quotes')
  getAllQuotes() {
    return this.market.getAllEquityQuotes();
  }

  @Get('quotes/:symbol')
  getQuote(@Param('symbol') symbol: string) {
    return this.market.getEquityQuote(symbol.toUpperCase());
  }

  @Get('options/:symbol')
  getOptionsChain(@Param('symbol') symbol: string) {
    return this.market.getOptionsChain(symbol.toUpperCase());
  }

  @Get('movers')
  getMovers() {
    return this.market.getMovers();
  }
}

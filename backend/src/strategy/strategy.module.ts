import { Module } from '@nestjs/common';
import { MarketModule } from '../market/market.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { TradeSetupController } from './trade-setup.controller';
import { TransactionController } from './transaction.controller';
import { TradeSetupService } from './trade-setup.service';
import { TransactionService } from './transaction.service';

@Module({
  imports: [MarketModule, PortfolioModule],
  controllers: [TradeSetupController, TransactionController],
  providers: [TradeSetupService, TransactionService],
})
export class StrategyModule {}

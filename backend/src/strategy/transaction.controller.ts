import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { TransactionService } from './transaction.service';
import { RecordTransactionDto } from './dto/record-transaction.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('trades/:id/transactions')
  record(
    @CurrentUser() user: JwtPayload,
    @Param('id') tradeId: string,
    @Body() dto: RecordTransactionDto,
  ) {
    return this.transactionService.record(user.sub, user.orgId, tradeId, dto);
  }

  @Get('trades/:id/transactions')
  listForTrade(@CurrentUser() user: JwtPayload, @Param('id') tradeId: string) {
    return this.transactionService.listForTrade(user.sub, tradeId);
  }

  @Get('transactions')
  listAll(
    @CurrentUser() user: JwtPayload,
    @Query('symbol')   symbol?: string,
    @Query('side')     side?: string,
    @Query('txnType')  txnType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo')   dateTo?: string,
  ) {
    return this.transactionService.listAll(user.sub, { symbol, side, txnType, dateFrom, dateTo });
  }

  @Delete('transactions/:txnId')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@CurrentUser() user: JwtPayload, @Param('txnId') txnId: string) {
    return this.transactionService.delete(user.sub, txnId);
  }
}

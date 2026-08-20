import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PortfolioService } from '../portfolio/portfolio.service';
import { RecordTransactionDto } from './dto/record-transaction.dto';

@Injectable()
export class TransactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly portfolio: PortfolioService,
  ) {}

  async record(userId: string, orgId: string, tradeId: string, dto: RecordTransactionDto) {
    const trade = await this.prisma.tradeSetup.findFirst({ where: { id: tradeId, userId } });
    if (!trade) throw new NotFoundException('Trade setup not found');

    if (dto.accumulationLevelId) {
      const level = await this.prisma.accumulationLevel.findFirst({
        where: { id: dto.accumulationLevelId, tradeSetupId: tradeId },
      });
      if (!level) throw new BadRequestException('Accumulation level not found for this trade');
    }

    if (dto.targetId) {
      const target = await this.prisma.tradeTarget.findFirst({
        where: { id: dto.targetId, tradeSetupId: tradeId },
      });
      if (!target) throw new BadRequestException('Target not found for this trade');
    }

    const txnRef = await this.generateTxnRef();

    let pnl: number | null = null;
    if (dto.side === 'SELL') {
      const avgCost = await this.getAvgCost(tradeId, userId);
      if (avgCost != null) {
        pnl = (dto.price - avgCost) * dto.qty - (dto.charges ?? 0);
      }
    }

    const txn = await this.prisma.$transaction(async (tx) => {
      const created = await tx.tradeTransaction.create({
        data: {
          tradeSetupId:        tradeId,
          accumulationLevelId: dto.accumulationLevelId,
          targetId:            dto.targetId,
          userId,
          orgId,
          txnRef,
          symbol:              trade.symbol,
          side:                dto.side,
          qty:                 dto.qty,
          price:               dto.price,
          executedAt:          new Date(dto.executedAt),
          txnType:             dto.txnType,
          charges:             dto.charges ?? 0,
          pnl,
          notes:               dto.notes,
        },
      });

      // update level status if linked
      if (dto.accumulationLevelId) {
        const level = await tx.accumulationLevel.findUnique({ where: { id: dto.accumulationLevelId } });
        if (level) {
          const newExecutedQty = Number(level.executedQty) + dto.qty;
          const isFilled = newExecutedQty >= Number(level.plannedQty);
          await tx.accumulationLevel.update({
            where: { id: dto.accumulationLevelId },
            data: {
              executedQty:   newExecutedQty,
              executedPrice: dto.price,
              executedAt:    new Date(dto.executedAt),
              status:        isFilled ? 'filled' : 'partially_filled',
            },
          });
        }
      }

      // update target status if linked
      if (dto.targetId) {
        const target = await tx.tradeTarget.findUnique({ where: { id: dto.targetId } });
        if (target) {
          const plannedQty = target.plannedQty != null ? Number(target.plannedQty) : null;
          const newExecutedQty = Number(target.executedQty) + dto.qty;
          const isFilled = plannedQty != null && newExecutedQty >= plannedQty;
          await tx.tradeTarget.update({
            where: { id: dto.targetId },
            data: {
              executedQty:   newExecutedQty,
              executedPrice: dto.price,
              executedAt:    new Date(dto.executedAt),
              status:        isFilled ? 'filled' : 'partially_filled',
            },
          });
        }
      }

      return created;
    });

    // sync portfolio outside the transaction to avoid deadlocks
    await this.portfolio.applyTradeTransaction(userId, orgId, trade.symbol, dto.side, dto.qty, dto.price);

    return txn;
  }

  async listForTrade(userId: string, tradeId: string) {
    const trade = await this.prisma.tradeSetup.findFirst({ where: { id: tradeId, userId } });
    if (!trade) throw new NotFoundException('Trade setup not found');

    return this.prisma.tradeTransaction.findMany({
      where: { tradeSetupId: tradeId },
      orderBy: { executedAt: 'asc' },
    });
  }

  async listAll(
    userId: string,
    filters: { symbol?: string; side?: string; txnType?: string; dateFrom?: string; dateTo?: string },
  ) {
    const where: any = { userId };
    if (filters.symbol)  where.symbol  = filters.symbol.toUpperCase();
    if (filters.side)    where.side    = filters.side;
    if (filters.txnType) where.txnType = filters.txnType;
    if (filters.dateFrom || filters.dateTo) {
      where.executedAt = {};
      if (filters.dateFrom) where.executedAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo)   where.executedAt.lte = new Date(filters.dateTo);
    }

    return this.prisma.tradeTransaction.findMany({
      where,
      orderBy: { executedAt: 'desc' },
      include: {
        tradeSetup: { select: { tradeId: true, name: true, symbol: true } },
      },
    });
  }

  async delete(userId: string, txnId: string) {
    const txn = await this.prisma.tradeTransaction.findFirst({ where: { id: txnId, userId } });
    if (!txn) throw new NotFoundException('Transaction not found');

    await this.prisma.tradeTransaction.delete({ where: { id: txnId } });

    // reverse portfolio sync
    const reverseSide = txn.side === 'BUY' ? 'SELL' : 'BUY';
    await this.portfolio.applyTradeTransaction(
      userId,
      txn.orgId,
      txn.symbol,
      reverseSide,
      Number(txn.qty),
      Number(txn.price),
    );
  }

  private async getAvgCost(tradeId: string, userId: string): Promise<number | null> {
    const buys = await this.prisma.tradeTransaction.findMany({
      where: { tradeSetupId: tradeId, userId, side: 'BUY' },
      select: { qty: true, price: true },
    });
    if (buys.length === 0) return null;
    const totalCost = buys.reduce((s, b) => s + Number(b.qty) * Number(b.price), 0);
    const totalQty  = buys.reduce((s, b) => s + Number(b.qty), 0);
    return totalQty > 0 ? totalCost / totalQty : null;
  }

  private async generateTxnRef(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.tradeTransaction.count({
      where: { txnRef: { startsWith: `TXN-${dateStr}-` } },
    });
    return `TXN-${dateStr}-${String(count + 1).padStart(3, '0')}`;
  }
}

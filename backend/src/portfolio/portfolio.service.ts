import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LivePriceService } from '../market/live-price.service';
import { AddHoldingDto } from './dto/add-holding.dto';
import { UpdateHoldingDto } from './dto/update-holding.dto';
import { SellHoldingDto } from './dto/sell-holding.dto';

@Injectable()
export class PortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly livePrice: LivePriceService,
  ) {}

  private async getOrCreate(userId: string, orgId: string) {
    let portfolio = await this.prisma.portfolio.findUnique({ where: { userId } });
    if (!portfolio) {
      portfolio = await this.prisma.portfolio.create({ data: { userId, orgId } });
    }
    return portfolio;
  }

  async getWithPnl(userId: string, orgId: string) {
    // Compute holdings from transaction history first, then fallback to stored holdings
    const portfolio = await this.getOrCreate(userId, orgId);

    const txs = ((await this.prisma.tradeTransaction.findMany({ where: { userId, orgId }, orderBy: { executedAt: 'asc' } })) ?? [])
      .filter((txn) => !(txn.txnType === 'manual' && txn.side === 'SELL'));
    const sales = (await this.prisma.holdingSale.findMany({ where: { holding: { portfolioId: portfolio.id } }, include: { holding: true } }).catch(() => [])) ?? [];

    // Build per-symbol aggregates from trade transactions and holding sales
    const symbolMap: Record<string, { qty: number; avg: number; realized: number }> = {};
    const processTxn = (symbol: string, side: string, qty: number, price: number) => {
      const cur = symbolMap[symbol] ?? { qty: 0, avg: 0, realized: 0 };
      if (side === 'BUY') {
        const newQty = cur.qty + qty;
        const newAvg = newQty > 0 ? ((cur.qty * cur.avg) + qty * price) / newQty : 0;
        cur.qty = newQty; cur.avg = newAvg;
      } else if (side === 'SELL') {
        const sellQty = qty;
        const realized = sellQty * (price - cur.avg);
        cur.realized += realized;
        cur.qty = Math.max(0, cur.qty - sellQty);
        if (cur.qty === 0) cur.avg = 0;
      }
      symbolMap[symbol] = cur;
    };

    for (const t of txs) {
      processTxn(t.symbol, t.side, Number(t.qty), Number(t.price));
    }

    // incorporate holding_sales (manual sells) if schema present
    for (const s of sales) {
      const symbol = s.holding.symbol;
      processTxn(symbol, 'SELL', Number(s.qty), Number(s.price));
    }

    // load stored holdings for symbols not present in transactions
    const storedHoldings = await this.prisma.holding.findMany({ where: { portfolioId: portfolio.id }, orderBy: { createdAt: 'asc' } });

    const symbols = [...new Set([ ...Object.keys(symbolMap), ...storedHoldings.map(h => h.symbol) ])];
    const quotes  = await this.livePrice.getQuotes(symbols);

    let totalInvested = 0;
    let totalCurrent  = 0;

    const enriched = symbols.map((sym) => {
      const fromTx = symbolMap[sym];
      const stored = storedHoldings.find((h) => h.symbol === sym);

      const qty = fromTx ? fromTx.qty : stored ? Number(stored.qty) : 0;
      const avgBuyPrice = fromTx ? fromTx.avg : stored ? Number(stored.avgBuyPrice) : 0;
      const invested = qty * avgBuyPrice;

      const quote = quotes.get(sym) ?? null;
      const ltp     = quote?.ltp ?? null;
      const current = ltp != null ? qty * ltp : null;
      const pnl     = current != null ? current - invested : null;
      const pnlPct  = pnl   != null && invested > 0 ? (pnl / invested) * 100 : null;

      if (current != null) {
        totalInvested += invested;
        totalCurrent  += current;
      }

      return {
        id:           stored ? stored.id : `txn-${sym}`,
        symbol:       sym,
        qty,
        avgBuyPrice,
        buyDate:      stored ? stored.buyDate : null,
        notes:        stored ? stored.notes : null,
        tags:         stored ? stored.tags ?? [] : [],
        ltp,
        changePct:    quote?.changePct ?? null,
        invested,
        currentValue: current,
        pnl,
        pnlPct,
        realizedPnl:  fromTx ? fromTx.realized : 0,
      };
    });

    const totalPnl    = totalCurrent - totalInvested;
    const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

    return {
      id: portfolio.id,
      holdings: enriched,
      summary: {
        totalInvested,
        totalCurrentValue: totalCurrent,
        totalPnl,
        totalPnlPct,
      },
    };
  }

  async sellHolding(userId: string, holdingId: string, dto: any) {
    const holding = await this.assertOwnership(userId, holdingId);
    const qty = Number(dto.qty);
    const price = Number(dto.price);
    const charges = Number(dto.charges ?? 0);

    const portfolio = await this.getWithPnl(userId, holding.portfolio.orgId);
    const availableQty = portfolio.holdings.find((h) => h.symbol === holding.symbol)?.qty ?? Number(holding.qty);

    if (!Number.isFinite(qty) || qty <= 0 || qty > availableQty) {
      throw new BadRequestException('Sell quantity must be greater than 0 and cannot exceed the available holding quantity');
    }

    // compute pnl using current avgBuyPrice for the actual sold quantity
    const pnl = (price - Number(holding.avgBuyPrice)) * qty - charges;

    const sale = await this.prisma.holdingSale.create({ data: {
      holdingId: holding.id,
      qty,
      price,
      charges,
      pnl,
      notes: dto.notes,
      executedAt: new Date(),
    } });

    // The live holding quantity is derived from transactions/sales in the portfolio view.
    // Do not mutate the holding table here; that would double-subtract on the screen.
    const txnRef = await this.generateTxnRef();
    await this.prisma.tradeTransaction.create({ data: {
      tradeSetupId: null,
      userId,
      orgId: holding.portfolio.orgId,
      txnRef,
      symbol: holding.symbol,
      side: 'SELL',
      qty,
      price,
      executedAt: new Date(),
      txnType: 'manual',
      charges,
      pnl,
      notes: dto.notes,
    } });

    return { id: sale.id, qty: Number(sale.qty), price: Number(sale.price), charges: Number(sale.charges), pnl: Number(sale.pnl) };
  }

  async addHolding(userId: string, orgId: string, dto: AddHoldingDto) {
    const portfolio = await this.getOrCreate(userId, orgId);
    const created = await this.prisma.holding.create({
      data: {
        portfolioId: portfolio.id,
        symbol:      dto.symbol,
        qty:         dto.qty,
        avgBuyPrice: dto.avgBuyPrice,
        buyDate:     new Date(dto.buyDate),
        notes:       dto.notes,
        tags:        dto.tags ?? [],
      },
    });

    // record a trade transaction for the buy
    const txnRef = await this.generateTxnRef();
    await this.prisma.tradeTransaction.create({
      data: {
        tradeSetupId: null,
        userId,
        orgId,
        txnRef,
        symbol: dto.symbol,
        side: 'BUY',
        qty: dto.qty,
        price: dto.avgBuyPrice,
        executedAt: new Date(dto.buyDate),
        txnType: 'manual',
        charges: 0,
        notes: dto.notes,
      },
    });

    return created;
  }

  async updateHolding(userId: string, holdingId: string, dto: UpdateHoldingDto) {
    await this.assertOwnership(userId, holdingId);
    return this.prisma.holding.update({
      where: { id: holdingId },
      data: {
        ...(dto.qty         != null && { qty:         dto.qty }),
        ...(dto.avgBuyPrice != null && { avgBuyPrice: dto.avgBuyPrice }),
        ...(dto.buyDate     != null && { buyDate:     new Date(dto.buyDate) }),
        ...(dto.notes       != null && { notes:       dto.notes }),
      },
    });
  }

  async removeHolding(userId: string, holdingId: string) {
    await this.assertOwnership(userId, holdingId);
    await this.prisma.holding.delete({ where: { id: holdingId } });
  }

  async applyTradeTransaction(userId: string, orgId: string, symbol: string, side: string, qty: number, price: number) {
    const portfolio = await this.getOrCreate(userId, orgId);
    const existing  = await this.prisma.holding.findFirst({ where: { portfolioId: portfolio.id, symbol } });

    if (side === 'BUY') {
      if (existing) {
        const existingQty = Number(existing.qty);
        const existingAvg = Number(existing.avgBuyPrice);
        const newQty = existingQty + qty;
        const newAvg = (existingQty * existingAvg + qty * price) / newQty;
        await this.prisma.holding.update({
          where: { id: existing.id },
          data: { qty: newQty, avgBuyPrice: newAvg },
        });
      } else {
        await this.prisma.holding.create({
          data: {
            portfolioId: portfolio.id,
            symbol,
            qty,
            avgBuyPrice: price,
            buyDate:     new Date(),
          },
        });
      }
    } else if (side === 'SELL' && existing) {
      const newQty = Number(existing.qty) - qty;
      if (newQty <= 0) {
        await this.prisma.holding.delete({ where: { id: existing.id } });
      } else {
        await this.prisma.holding.update({ where: { id: existing.id }, data: { qty: newQty } });
      }
    }
  }

  private async generateTxnRef(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.tradeTransaction.count({
      where: { txnRef: { startsWith: `TXN-${dateStr}-` } },
    });
    return `TXN-${dateStr}-${String(count + 1).padStart(3, '0')}`;
  }

  private async assertOwnership(userId: string, holdingId: string) {
    const holding = await this.prisma.holding.findUnique({
      where: { id: holdingId },
      include: { portfolio: true },
    });
    if (!holding || holding.portfolio.userId !== userId) {
      throw new NotFoundException('Holding not found');
    }
    return holding;
  }
}

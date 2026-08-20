import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LivePriceService } from '../market/live-price.service';
import { CreateTradeSetupDto } from './dto/create-trade-setup.dto';
import { UpdateTradeSetupDto } from './dto/update-trade-setup.dto';
import { SaveLevelsDto } from './dto/save-levels.dto';
import { SaveTargetsDto } from './dto/save-targets.dto';
import { UpdateLevelDto } from './dto/update-level.dto';

@Injectable()
export class TradeSetupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly livePrice: LivePriceService,
  ) {}

  async create(userId: string, orgId: string, dto: CreateTradeSetupDto) {
    if (dto.buyRangeLow >= dto.buyRangeHigh) {
      throw new BadRequestException('buyRangeLow must be less than buyRangeHigh');
    }

    const tradeId = await this.generateTradeId();
    const rangeSize = dto.buyRangeHigh - dto.buyRangeLow;
    const step = dto.levelCount === 1 ? 0 : rangeSize / (dto.levelCount - 1);

    const levels = Array.from({ length: dto.levelCount }, (_, i) => ({
      levelNum:     i + 1,
      triggerPrice: dto.buyRangeHigh - i * step,
      plannedQty:   dto.defaultQtyPerLevel,
    }));

    return this.prisma.tradeSetup.create({
      data: {
        userId,
        orgId,
        tradeId,
        name:         dto.name.trim(),
        description:  dto.description,
        tags:         dto.tags ?? [],
        symbol:       dto.symbol.trim().toUpperCase(),
        buyRangeHigh: dto.buyRangeHigh,
        buyRangeLow:  dto.buyRangeLow,
        status:       'draft',
        slType:       dto.slType,
        slValue:      dto.slValue,
        slReference:  dto.slReference,
        notes:        dto.notes,
        accLevels: { createMany: { data: levels } },
      },
      include: {
        accLevels: { orderBy: { levelNum: 'asc' } },
        targets:   { orderBy: { levelNum: 'asc' } },
      },
    });
  }

  async listAll(userId: string, filters: { status?: string; symbol?: string; tags?: string[] }) {
    const where: any = { userId };
    if (filters.status) where.status = filters.status;
    if (filters.symbol) where.symbol = filters.symbol.toUpperCase();
    if (filters.tags && filters.tags.length > 0) where.tags = { hasSome: filters.tags };

    const trades = await this.prisma.tradeSetup.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        accLevels:    { orderBy: { levelNum: 'asc' } },
        targets:      { orderBy: { levelNum: 'asc' } },
        transactions: { select: { side: true, qty: true, price: true, charges: true, pnl: true } },
      },
    });

    return trades.map((t) => this.computeFields(t));
  }

  async getOne(userId: string, id: string) {
    const trade = await this.prisma.tradeSetup.findFirst({
      where: { id, userId },
      include: {
        accLevels:    { orderBy: { levelNum: 'asc' } },
        targets:      { orderBy: { levelNum: 'asc' } },
        transactions: { orderBy: { executedAt: 'asc' } },
      },
    });
    if (!trade) throw new NotFoundException('Trade not found');

    const computed = this.computeFields(trade);

    const quotes = await this.livePrice.getQuotes([trade.symbol]);
    const ltp = quotes.get(trade.symbol)?.ltp ?? null;

    const unrealizedPnl =
      ltp != null && computed.avgCost != null && computed.currentQty > 0
        ? (ltp - computed.avgCost) * computed.currentQty
        : null;

    return { ...computed, ltp, unrealizedPnl };
  }

  async update(userId: string, id: string, dto: UpdateTradeSetupDto) {
    await this.assertOwnership(userId, id);
    return this.prisma.tradeSetup.update({
      where: { id },
      data: {
        ...(dto.name        != null && { name:        dto.name }),
        ...(dto.description != null && { description: dto.description }),
        ...(dto.tags        != null && { tags:        dto.tags }),
        ...(dto.status      != null && { status:      dto.status }),
        ...(dto.slType      != null && { slType:      dto.slType }),
        ...(dto.slValue     != null && { slValue:     dto.slValue }),
        ...(dto.slReference != null && { slReference: dto.slReference }),
        ...(dto.slStatus    != null && { slStatus:    dto.slStatus }),
        ...(dto.notes       != null && { notes:       dto.notes }),
      },
    });
  }

  async delete(userId: string, id: string) {
    const trade = await this.assertOwnership(userId, id);
    if (!['draft', 'cancelled'].includes(trade.status)) {
      throw new BadRequestException('Only draft or cancelled trades can be deleted');
    }
    await this.prisma.tradeSetup.delete({ where: { id } });
  }

  async saveLevels(userId: string, tradeId: string, dto: SaveLevelsDto) {
    await this.assertOwnership(userId, tradeId);

    await this.prisma.$transaction(async (tx) => {
      await tx.accumulationLevel.deleteMany({ where: { tradeSetupId: tradeId } });
      await tx.accumulationLevel.createMany({
        data: dto.levels.map((l) => ({
          tradeSetupId: tradeId,
          levelNum:     l.levelNum,
          triggerPrice: l.triggerPrice,
          plannedQty:   l.plannedQty,
        })),
      });
    });

    return this.prisma.accumulationLevel.findMany({
      where: { tradeSetupId: tradeId },
      orderBy: { levelNum: 'asc' },
    });
  }

  async saveTargets(userId: string, tradeId: string, dto: SaveTargetsDto) {
    await this.assertOwnership(userId, tradeId);

    await this.prisma.$transaction(async (tx) => {
      await tx.tradeTarget.deleteMany({ where: { tradeSetupId: tradeId } });
      await tx.tradeTarget.createMany({
        data: dto.targets.map((t) => ({
          tradeSetupId: tradeId,
          levelNum:     t.levelNum,
          targetPrice:  t.targetPrice,
          plannedQty:   t.plannedQty,
          plannedPct:   t.plannedPct,
        })),
      });
    });

    return this.prisma.tradeTarget.findMany({
      where: { tradeSetupId: tradeId },
      orderBy: { levelNum: 'asc' },
    });
  }

  async updateLevel(userId: string, tradeId: string, levelId: string, dto: UpdateLevelDto) {
    await this.assertOwnership(userId, tradeId);
    const level = await this.prisma.accumulationLevel.findFirst({ where: { id: levelId, tradeSetupId: tradeId } });
    if (!level) throw new NotFoundException('Level not found');

    return this.prisma.accumulationLevel.update({
      where: { id: levelId },
      data: {
        ...(dto.status        != null && { status:        dto.status }),
        ...(dto.executedPrice != null && { executedPrice: dto.executedPrice }),
        ...(dto.executedQty   != null && { executedQty:   dto.executedQty }),
        ...(dto.executedAt    != null && { executedAt:    new Date(dto.executedAt) }),
      },
    });
  }

  private computeFields(trade: any) {
    const txns: any[] = trade.transactions ?? [];
    const buys  = txns.filter((t) => t.side === 'BUY');
    const sells = txns.filter((t) => t.side === 'SELL');

    const purchasedQty = buys.reduce((s: number, t: any) => s + Number(t.qty), 0);
    const soldQty      = sells.reduce((s: number, t: any) => s + Number(t.qty), 0);
    const currentQty   = purchasedQty - soldQty;

    const totalCost = buys.reduce((s: number, t: any) => s + Number(t.qty) * Number(t.price), 0);
    const avgCost   = purchasedQty > 0 ? totalCost / purchasedQty : null;
    const totalInvested = avgCost != null ? purchasedQty * avgCost : 0;

    const realizedPnl = sells.reduce((s: number, t: any) => s + (t.pnl != null ? Number(t.pnl) : 0), 0);

    const levels: any[] = trade.accLevels ?? [];
    const targets: any[] = trade.targets ?? [];
    const plannedQty = levels.reduce((s: number, l: any) => s + Number(l.plannedQty), 0);
    const nextLevel = levels.find((l) => l.status === 'pending') ?? null;
    const nextTarget = targets.find((t) => t.status === 'pending') ?? null;
    const derivedStatus = this.deriveStatus({
      tradeStatus: trade.status,
      purchasedQty,
      soldQty,
      currentQty,
      plannedQty,
      levels,
      targets,
    });

    return {
      id:           trade.id,
      tradeId:      trade.tradeId,
      name:         trade.name,
      description:  trade.description,
      tags:         trade.tags ?? [],
      symbol:       trade.symbol,
      buyRangeHigh: Number(trade.buyRangeHigh),
      buyRangeLow:  Number(trade.buyRangeLow),
      status:       derivedStatus,
      slType:       trade.slType,
      slValue:      trade.slValue != null ? Number(trade.slValue) : null,
      slReference:  trade.slReference,
      slStatus:     trade.slStatus,
      notes:        trade.notes,
      createdAt:    trade.createdAt,
      updatedAt:    trade.updatedAt,
      accLevels:    levels,
      targets,
      transactions: trade.transactions,
      plannedQty,
      purchasedQty,
      soldQty,
      currentQty,
      avgCost,
      totalInvested,
      realizedPnl,
      nextLevel,
      nextTarget,
    };
  }

  private deriveStatus(args: {
    tradeStatus: string;
    purchasedQty: number;
    soldQty: number;
    currentQty: number;
    plannedQty: number;
    levels: any[];
    targets: any[];
  }): string {
    const { tradeStatus, purchasedQty, soldQty, currentQty, plannedQty, levels, targets } = args;
    if (tradeStatus === 'cancelled') return 'cancelled';
    if (tradeStatus === 'draft' && purchasedQty === 0 && soldQty === 0) return 'draft';
    if (currentQty <= 0 && purchasedQty > 0 && soldQty >= purchasedQty) return 'closed';

    const hasAnyLevelFilled = levels.some((level) => ['filled', 'partially_filled'].includes(level.status));
    const hasAnyTargetFilled = targets.some((target) => ['filled', 'partially_filled'].includes(target.status));

    if (purchasedQty > 0 && currentQty > 0 && purchasedQty < plannedQty) return 'accumulating';
    if (purchasedQty > 0 && currentQty > 0 && purchasedQty >= plannedQty && !hasAnyTargetFilled) return 'fully_accumulated';
    if (hasAnyTargetFilled || targets.length > 0) return 'targeting';
    if (hasAnyLevelFilled) return 'accumulating';
    if (purchasedQty > 0 && currentQty > 0) return 'active';
    if (currentQty === 0 && soldQty > 0) return 'closed';

    return tradeStatus || 'draft';
  }

  async assertOwnership(userId: string, id: string) {
    const trade = await this.prisma.tradeSetup.findFirst({ where: { id, userId } });
    if (!trade) throw new ForbiddenException('Trade not found');
    return trade;
  }

  private async generateTradeId(): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.tradeSetup.count({
      where: { tradeId: { startsWith: `TRD-${dateStr}-` } },
    });
    return `TRD-${dateStr}-${String(count + 1).padStart(3, '0')}`;
  }
}

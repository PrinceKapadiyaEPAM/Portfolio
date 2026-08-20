import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScreenerFiltersDto } from './dto/screener-filters.dto';
import { CreatePresetDto } from './dto/create-preset.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ScreenerService {
  constructor(private readonly prisma: PrismaService) {}

  async runScreener(filters: ScreenerFiltersDto) {
    const where: Prisma.MarketSnapshotWhereInput = {};

    if (filters.change_gt != null || filters.change_lt != null) {
      where.changePct = {
        ...(filters.change_gt != null && { gt: filters.change_gt }),
        ...(filters.change_lt != null && { lt: filters.change_lt }),
      };
    }

    if (filters.volume_gt != null || filters.volume_lt != null) {
      where.volume = {
        ...(filters.volume_gt != null && { gt: BigInt(Math.round(filters.volume_gt)) }),
        ...(filters.volume_lt != null && { lt: BigInt(Math.round(filters.volume_lt)) }),
      };
    }

    if (filters.per_change_365d_gt != null || filters.per_change_365d_lt != null) {
      where.perChange365d = {
        ...(filters.per_change_365d_gt != null && { gt: filters.per_change_365d_gt }),
        ...(filters.per_change_365d_lt != null && { lt: filters.per_change_365d_lt }),
      };
    }

    const sortField  = filters.sort_by    ?? 'changePct';
    const sortOrder  = filters.sort_order ?? 'desc';
    const limit      = filters.limit      ?? 100;

    const rows = await this.prisma.marketSnapshot.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      take: limit,
    });

    // Serialize BigInt/Decimal to plain numbers for JSON
    return rows.map((r) => ({
      symbol:        r.symbol,
      ltp:           Number(r.ltp),
      changePct:     Number(r.changePct),
      volume:        Number(r.volume),
      week52High:    r.week52High    != null ? Number(r.week52High)    : null,
      week52Low:     r.week52Low     != null ? Number(r.week52Low)     : null,
      perChange365d: r.perChange365d != null ? Number(r.perChange365d) : null,
      snappedAt:     r.snappedAt,
    }));
  }

  async getSnapshotAge() {
    const latest = await this.prisma.marketSnapshot.findFirst({
      orderBy: { snappedAt: 'desc' },
      select: { snappedAt: true },
    });
    const count = await this.prisma.marketSnapshot.count();
    return { snappedAt: latest?.snappedAt ?? null, count };
  }

  // ── Presets ──────────────────────────────────────────────────────────────

  async listPresets(userId: string) {
    return this.prisma.screenerPreset.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, filters: true, createdAt: true },
    });
  }

  async createPreset(userId: string, orgId: string, dto: CreatePresetDto) {
    return this.prisma.screenerPreset.create({
      data: { userId, orgId, name: dto.name, filters: dto.filters as Prisma.InputJsonValue },
      select: { id: true, name: true, filters: true, createdAt: true },
    });
  }

  async deletePreset(userId: string, id: string) {
    const preset = await this.prisma.screenerPreset.findUnique({ where: { id } });
    if (!preset || preset.userId !== userId) throw new NotFoundException('Preset not found');
    await this.prisma.screenerPreset.delete({ where: { id } });
  }

  async searchSymbols(q: string): Promise<{ symbol: string; ltp: number }[]> {
    const rows = await this.prisma.marketSnapshot.findMany({
      where: { symbol: { startsWith: q.toUpperCase() } },
      select: { symbol: true, ltp: true },
      orderBy: { symbol: 'asc' },
      take: 10,
    });
    return rows.map((r) => ({ symbol: r.symbol, ltp: Number(r.ltp) }));
  }
}

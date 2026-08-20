import { Injectable, Logger } from '@nestjs/common';
import { NseClientService } from '../nse/nse-client.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ScreenerSnapshotPoller {
  private readonly logger = new Logger(ScreenerSnapshotPoller.name);

  constructor(
    private readonly nse: NseClientService,
    private readonly prisma: PrismaService,
  ) {}

  async poll(): Promise<void> {
    const data = await this.nse.fetchAllStocks();
    if (!data) return;

    const rows: any[] = (data as any)?.data ?? [];
    if (rows.length === 0) {
      this.logger.warn('fetchAllStocks returned 0 rows');
      return;
    }

    const today     = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const ago365    = new Date(todayDate); ago365.setFullYear(ago365.getFullYear() - 1);

    // Build map of symbol → price-365d-ago from daily_prices (within ±5 days window)
    const windowStart = new Date(ago365); windowStart.setDate(windowStart.getDate() - 5);
    const windowEnd   = new Date(ago365); windowEnd.setDate(windowEnd.getDate() + 5);

    const historical = await this.prisma.dailyPrice.findMany({
      where: { date: { gte: windowStart, lte: windowEnd } },
      orderBy: { date: 'desc' },
    });

    // Keep only the closest record per symbol
    const ago365Map = new Map<string, number>();
    for (const row of historical) {
      if (!ago365Map.has(row.symbol)) {
        ago365Map.set(row.symbol, Number(row.closePrice));
      }
    }

    const snappedAt = new Date();
    let upserted = 0;

    for (let i = 0; i < rows.length; i += 200) {
      const batch = rows.slice(i, i + 200);
      await Promise.all(
        batch.map((row: any) => {
          const m = row?.metadata ?? {};
          const symbol = (m.symbol as string | undefined)?.trim().toUpperCase();
          if (!symbol || m.lastPrice == null) return Promise.resolve();

          const currentPrice = m.lastPrice as number;
          const volume = BigInt(Math.round(
            row?.detail?.preOpenMarket?.totalTradedVolume ?? 0,
          ));

          const oldPrice     = ago365Map.get(symbol);
          const perChange365d = oldPrice != null
            ? ((currentPrice - oldPrice) / oldPrice) * 100
            : null;

          return this.prisma.marketSnapshot.upsert({
            where:  { symbol },
            create: { symbol, ltp: currentPrice, changePct: m.pChange ?? 0, volume, week52High: m.yearHigh ?? null, week52Low: m.yearLow ?? null, perChange365d, snappedAt },
            update: { ltp: currentPrice, changePct: m.pChange ?? 0, volume, week52High: m.yearHigh ?? null, week52Low: m.yearLow ?? null, perChange365d, snappedAt },
          }).then(() => { upserted++; }).catch(() => { /* skip bad row */ });
        }),
      );
    }

    this.logger.log(`Screener snapshot — ${upserted}/${rows.length} upserted, ${ago365Map.size} symbols with 365d data`);

    // Save today's prices to daily_prices for future 365d computation
    await this.saveDailyPrices(rows, todayDate);
  }

  private async saveDailyPrices(rows: any[], date: Date): Promise<void> {
    const values = rows
      .map((row: any) => {
        const m = row?.metadata ?? {};
        const symbol = (m.symbol as string | undefined)?.trim().toUpperCase();
        if (!symbol || m.lastPrice == null) return null;
        return { symbol, date, closePrice: m.lastPrice as number };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    for (let i = 0; i < values.length; i += 200) {
      const batch = values.slice(i, i + 200);
      await Promise.all(
        batch.map((v) =>
          this.prisma.dailyPrice.upsert({
            where:  { symbol_date: { symbol: v.symbol, date: v.date } },
            create: v,
            update: { closePrice: v.closePrice },
          }).catch(() => {}),
        ),
      );
    }

    this.logger.log(`Saved ${values.length} daily prices for ${date.toISOString().slice(0, 10)}`);
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MarketHoursService } from '../market-hours/market-hours.service';
import { EquityQuotesPoller } from './equity-quotes.poller';
import { IndicesPoller } from './indices.poller';
import { OptionsChainPoller } from './options-chain.poller';
import { GainersLosersPoller } from './gainers-losers.poller';
import { MarketStatusPoller } from './market-status.poller';
import { ScreenerSnapshotPoller } from './screener-snapshot.poller';

@Injectable()
export class PollingOrchestrator implements OnModuleInit {
  private readonly logger = new Logger(PollingOrchestrator.name);
  private warmedUp = false;

  constructor(
    private readonly marketHours: MarketHoursService,
    private readonly equityQuotes: EquityQuotesPoller,
    private readonly indices: IndicesPoller,
    private readonly optionsChain: OptionsChainPoller,
    private readonly gainersLosers: GainersLosersPoller,
    private readonly marketStatus: MarketStatusPoller,
    private readonly screenerSnapshot: ScreenerSnapshotPoller,
  ) {}

  onModuleInit() {
    // Stagger startup: status immediately, market-data polls after 10s
    this.runSafe('market-status-init', () => this.marketStatus.poll());

    setTimeout(async () => {
      const phase = this.marketHours.marketPhase();
      if (phase === 'closed' || phase === 'weekend') {
        this.logger.log(`Market is ${phase} — attempting one-off warm-up to populate last-close caches`);
        // Attempt to populate last-close snapshots so the dashboard can show data
        await Promise.allSettled([
          this.runSafe('indices-init',        () => this.indices.poll()),
          this.runSafe('gainers-losers-init', () => this.gainersLosers.poll()),
        ]);
        this.warmedUp = true;
        this.logger.log('One-off warm-up complete');
        return;
      }
      this.logger.log('Warm-up polls starting');
      await Promise.allSettled([
        this.runSafe('indices-init',        () => this.indices.poll()),
        this.runSafe('gainers-losers-init', () => this.gainersLosers.poll()),
        this.runSafe('equity-quotes-init',  () => this.equityQuotes.poll()),
      ]);
      this.warmedUp = true;
      this.logger.log('Warm-up polls complete');
      this.runSafe('screener-snapshot-init', () => this.screenerSnapshot.poll());
    }, 10_000);
  }

  // ── Cron jobs — only fire during market hours after warm-up ──────────────

  @Cron('*/15 * * * * *')
  async runEquityQuotes() {
    if (!this.warmedUp || !this.marketHours.isMarketOpen()) return;
    await this.runSafe('equity-quotes', () => this.equityQuotes.poll());
  }

  @Cron('*/10 * * * * *')
  async runIndices() {
    if (!this.warmedUp || !this.marketHours.isMarketOpen()) return;
    await this.runSafe('indices', () => this.indices.poll());
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async runOptionsChain() {
    if (!this.warmedUp || !this.marketHours.isMarketOpen()) return;
    await this.runSafe('options-chain', () => this.optionsChain.poll());
  }

  @Cron('*/30 * * * * *')
  async runGainersLosers() {
    if (!this.warmedUp || !this.marketHours.isMarketOpen()) return;
    await this.runSafe('gainers-losers', () => this.gainersLosers.poll());
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async runMarketStatus() {
    if (!this.warmedUp) return;
    await this.runSafe('market-status', () => this.marketStatus.poll());
  }

  // Daily at 15:35 IST (10:05 UTC) Mon–Fri
  @Cron('5 10 * * 1-5')
  async runScreenerSnapshot() {
    await this.runSafe('screener-snapshot', () => this.screenerSnapshot.poll());
  }

  async refreshMarketData(): Promise<void> {
    const phase = this.marketHours.marketPhase();
    const jobs = [
      this.runSafe('market-status-refresh', () => this.marketStatus.poll()),
      this.runSafe('indices-refresh', () => this.indices.poll()),
      this.runSafe('gainers-losers-refresh', () => this.gainersLosers.poll()),
    ];

    if (phase === 'open' || phase === 'pre-open') {
      jobs.push(this.runSafe('equity-quotes-refresh', () => this.equityQuotes.poll()));
    }

    await Promise.allSettled(jobs);
  }

  private async runSafe(job: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (err) {
      this.logger.error(`Poll job "${job}" threw: ${(err as Error).message}`);
    }
  }
}

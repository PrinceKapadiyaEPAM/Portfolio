import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NseIndia } from 'stock-nse-india';

@Injectable()
export class NseClientService implements OnModuleInit {
  private readonly logger = new Logger(NseClientService.name);
  private nse: NseIndia;

  private failures = 0;
  private circuitOpenUntil = 0;

  private get maxRetries()    { return parseInt(this.config.get('NSE_MAX_RETRIES')               ?? '3',      10); }
  private get baseDelayMs()   { return parseInt(this.config.get('NSE_RETRY_BASE_DELAY_MS')       ?? '2000',   10); }
  private get circuitDurMs()  { return parseInt(this.config.get('NSE_CIRCUIT_OPEN_DURATION_MS')  ?? '120000', 10); }

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.nse = new NseIndia();
  }

  async fetchEquityQuote(symbol: string) {
    return this.run(() => this.nse.getEquityDetails(symbol), `equityQuote:${symbol}`);
  }

  async fetchAllIndices() {
    return this.run(() => this.nse.getAllIndices(), 'allIndices');
  }

  async fetchIndexQuote(index: string) {
    return this.run(() => this.nse.getEquityStockIndices(index), `indexQuote:${index}`);
  }

  async fetchIndexOptionChain(symbol: string) {
    return this.run(() => this.nse.getIndexOptionChain(symbol), `optionChain:${symbol}`);
  }

  async fetchEquityOptionChain(symbol: string) {
    return this.run(() => this.nse.getEquityOptionChain(symbol), `equityOptionChain:${symbol}`);
  }

  async fetchMarketTurnover() {
    return this.run(() => this.nse.getMarketTurnover(), 'marketTurnover');
  }

  async fetchAllStocks() {
    return this.run(() => this.nse.getPreOpenMarketData(), 'allStocks');
  }

  async fetchMarketStatus() {
    return this.run(() => this.nse.getMarketStatus(), 'marketStatus');
  }

  private async run<T>(operation: () => Promise<T>, name: string): Promise<T | null> {
    if (this.isCircuitOpen()) {
      this.logger.debug(`Circuit open — skipping ${name}`);
      return null;
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await operation();
        this.onSuccess();
        return result;
      } catch (err) {
        const delay = this.baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000;
        this.logger.warn(`NSE ${name} attempt ${attempt}/${this.maxRetries} failed: ${err}. Retry in ${Math.round(delay)}ms`);
        if (attempt < this.maxRetries) await this.sleep(delay);
      }
    }

    this.onFailure();
    return null;
  }

  private onSuccess() {
    this.failures = 0;
    this.circuitOpenUntil = 0;
  }

  private onFailure() {
    this.failures++;
    if (this.failures >= this.maxRetries) {
      this.circuitOpenUntil = Date.now() + this.circuitDurMs;
      this.logger.error(`Circuit OPEN for ${this.circuitDurMs / 1000}s after ${this.failures} failures`);
    }
  }

  private isCircuitOpen(): boolean {
    if (this.circuitOpenUntil === 0) return false;
    if (Date.now() > this.circuitOpenUntil) {
      this.logger.log('Circuit half-open — probing NSE');
      this.circuitOpenUntil = 0;
      this.failures = 0;
      return false;
    }
    return true;
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}

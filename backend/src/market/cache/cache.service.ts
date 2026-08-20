import { Injectable, Inject, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { Redis } from 'ioredis';

interface MemEntry { value: string; expiresAt: number }

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly mem = new Map<string, MemEntry>();

  constructor(
    @Optional() @Inject('REDIS_CLIENT') private readonly redis: Redis | null,
  ) {
    if (!redis) {
      this.logger.warn('Redis not configured — using in-memory cache (non-persistent, single-node only)');
    }
  }

  get isAvailable(): boolean { return this.redis !== null; }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return this.memGet<T>(key);
    try {
      const value = await this.redis.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (err) {
      this.logger.warn(`Redis GET failed for "${key}": ${err}`);
      return this.memGet<T>(key);
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!this.redis) { this.memSet(key, value, ttlSeconds); return; }
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`Redis SET failed for "${key}": ${err}`);
      this.memSet(key, value, ttlSeconds);
    }
  }

  async del(key: string): Promise<void> {
    this.mem.delete(key);
    if (!this.redis) return;
    try { await this.redis.del(key); } catch (err) {
      this.logger.warn(`Redis DEL failed for "${key}": ${err}`);
    }
  }

  async ttl(key: string): Promise<number> {
    if (!this.redis) {
      const entry = this.mem.get(key);
      if (!entry) return -2;
      const remaining = Math.round((entry.expiresAt - Date.now()) / 1000);
      return remaining > 0 ? remaining : -2;
    }
    try { return await this.redis.ttl(key); } catch { return -2; }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.redis) {
      const entry = this.mem.get(key);
      return !!entry && entry.expiresAt > Date.now();
    }
    try { return (await this.redis.exists(key)) === 1; } catch { return false; }
  }

  async clearAll(): Promise<{ cleared: boolean; source: 'memory' | 'redis' }> {
    this.mem.clear();
    if (!this.redis) return { cleared: true, source: 'memory' };

    try {
      await this.redis.flushdb();
      return { cleared: true, source: 'redis' };
    } catch (err) {
      this.logger.warn(`Redis FLUSHDB failed: ${err}`);
      return { cleared: true, source: 'memory' };
    }
  }

  async onModuleDestroy() {
    this.mem.clear();
    if (this.redis) await this.redis.quit();
  }

  // ── In-memory helpers ────────────────────────────────────────────────────

  private memGet<T>(key: string): T | null {
    const entry = this.mem.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) { this.mem.delete(key); return null; }
    return JSON.parse(entry.value) as T;
  }

  private memSet<T>(key: string, value: T, ttlSeconds: number): void {
    this.mem.set(key, { value: JSON.stringify(value), expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}

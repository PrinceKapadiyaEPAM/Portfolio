import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { CacheService } from './cache.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis | null => {
        const enabled = config.get<string>('REDIS_ENABLED');
        if (enabled !== 'true') return null;

        const host = config.get<string>('REDIS_HOST');
        if (!host) return null;

        const tls = config.get('REDIS_TLS') === 'true';
        return new Redis({
          host,
          port:      parseInt(config.get('REDIS_PORT') ?? '6379', 10),
          password:  config.get<string>('REDIS_PASSWORD') || undefined,
          keyPrefix: config.get<string>('REDIS_KEY_PREFIX') ?? 'nse:',
          tls:       tls ? {} : undefined,
          retryStrategy: (times) => (times > 5 ? null : Math.min(times * 500, 3000)),
          enableReadyCheck: false,
          lazyConnect: true,
          maxRetriesPerRequest: 2,
        });
      },
    },
    CacheService,
  ],
  exports: ['REDIS_CLIENT', CacheService],
})
export class CacheModule {}

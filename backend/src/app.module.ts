import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { MarketModule } from './market/market.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { ScreenerModule } from './screener/screener.module';
import { AuditModule } from './audit/audit.module';
import { StrategyModule } from './strategy/strategy.module';
import { OrganizationModule } from './organization/organization.module';
import appConfig from './common/config/app.config';
import { validationSchema } from './common/config/validation.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: '.env',
      validationSchema,
      validationOptions: { abortEarly: false },
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000,  limit: 20  },
      { name: 'long',  ttl: 60000, limit: 300 },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    HealthModule,
    MarketModule,
    WatchlistModule,
    PortfolioModule,
    ScreenerModule,
    AuditModule,
    StrategyModule,
    // Organization management (superadmin only)
    OrganizationModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}

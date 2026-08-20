# Technical Architecture
**Project:** SaaS FinTech Platform — NSE Market Data
**Last Updated:** 2026-08-19

---

## System Overview

Multi-tenant SaaS web application providing NSE market data, portfolio tracking, and stock screening.
Hosted entirely on Microsoft Azure using Platform-as-a-Service (PaaS) — no containers, no Kubernetes.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Browser                         │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS
┌─────────────────────────▼───────────────────────────────┐
│           Azure App Service — Frontend                  │
│           Next.js 14 + TypeScript                       │
│           Node.js 20 runtime, B1 plan                   │
│           Custom domain + managed SSL certificate       │
└─────────────────────────┬───────────────────────────────┘
                          │ REST API (HTTPS)
┌─────────────────────────▼───────────────────────────────┐
│           Azure App Service — Backend                   │
│           NestJS 10 + TypeScript                        │
│           Node.js 20 runtime, B2 plan                   │
│           Deployment slots: production + staging        │
└────────┬──────────────────────────┬─────────────────────┘
         │                          │
┌────────▼────────┐      ┌──────────▼──────────┐
│ Azure DB for    │      │ Azure Cache for      │
│ PostgreSQL      │      │ Redis                │
│ Flexible Server │      │ C1 Basic (1GB)       │
│ B2ms, Multi-AZ  │      │ TLS port 6380        │
└─────────────────┘      └──────────────────────┘

Supporting Services:
┌──────────────┐ ┌─────────────────────┐ ┌────────────────────┐
│ Azure Key    │ │ Application Insights │ │ GitHub Actions     │
│ Vault        │ │ + Azure Monitor      │ │ CI/CD              │
│ (Secrets)    │ │ (Observability)      │ │                    │
└──────────────┘ └─────────────────────┘ └────────────────────┘
```

---

## Technology Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| NestJS | 10.x | Application framework |
| TypeScript | 5.x | Language |
| Prisma | 5.x | ORM + database migrations |
| `@nestjs/jwt` | 10.x | JWT token handling |
| `@nestjs/passport` | 10.x | Auth strategy middleware |
| `@nestjs/schedule` | 4.x | Cron-based polling scheduler |
| `@nestjs/config` | 3.x | Environment config management |
| `@nestjs/throttler` | 5.x | Rate limiting |
| ioredis | 5.x | Redis client (direct, TLS-capable) |
| stock-nse-india | 1.4.x | NSE market data polling |
| luxon | 3.x | IST timezone calculations |
| bcrypt | 5.x | Password hashing |
| helmet | 7.x | HTTP security headers |
| class-validator | 0.14.x | DTO input validation |
| class-transformer | 0.5.x | DTO serialization |

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14.x | React framework (SSR + SSG) |
| TypeScript | 5.x | Language |
| React | 18.x | UI library |
| Tailwind CSS | 3.x | Styling |
| Axios | 1.x | HTTP client with interceptors |
| React Query (TanStack) | 5.x | Server state management + polling |
| Zustand | 4.x | Client state (auth, UI) |
| React Hook Form | 7.x | Form handling |
| Zod | 3.x | Frontend validation schemas |

### Infrastructure
| Service | Tier | Purpose |
|---------|------|---------|
| Azure App Service (backend) | B2 plan | NestJS hosting |
| Azure App Service (frontend) | B1 plan | Next.js hosting |
| Azure DB for PostgreSQL Flexible Server | B2ms | Primary database |
| Azure Cache for Redis | C1 Basic | Caching + rate limiting |
| Azure Key Vault | Standard | Secrets management |
| Application Insights | Pay-per-use | Monitoring + tracing |
| GitHub Actions | Free tier | CI/CD |

---

## Backend Architecture

### Application Layers

```
HTTP Request
    │
    ▼
Global Middleware (logging, tenant context injection)
    │
    ▼
Guard Layer (JwtAuthGuard → RolesGuard)
    │
    ▼
Controller (route handling, DTO binding)
    │
    ▼
Service (business logic)
    │
    ├──▶ Repository / Prisma (database)
    ├──▶ CacheService / ioredis (Redis)
    └──▶ NseClientService (NSE polling)
    │
    ▼
Global Exception Filter (structured error response)
```

### Module Structure

```
src/
  common/
    config/
      nse.config.ts          ← registerAs('nse', ...)
      redis.config.ts        ← registerAs('redis', ...)
    filters/
      http-exception.filter.ts
    middleware/
      logging.middleware.ts
      tenant-context.middleware.ts
    guards/
      jwt-auth.guard.ts
      roles.guard.ts
    decorators/
      roles.decorator.ts
      current-user.decorator.ts

  auth/
    auth.module.ts
    auth.controller.ts       ← /api/auth/*
    auth.service.ts
    strategies/
      jwt.strategy.ts
      local.strategy.ts

  users/
    users.module.ts
    users.controller.ts      ← /api/users/*
    users.service.ts

  market/
    market.module.ts
    market.controller.ts     ← /api/market/*
    market.service.ts
    cache/
      cache.module.ts
      cache.service.ts
      cache-keys.constant.ts
    nse/
      nse.module.ts
      nse-client.service.ts  ← circuit breaker + retry
      nse.types.ts
    polling/
      polling.module.ts
      polling.orchestrator.ts
      equity-quotes.poller.ts
      indices.poller.ts
      options-chain.poller.ts
      gainers-losers.poller.ts
      market-status.poller.ts
    guards/
      market-hours.service.ts
    dto/ ...

  watchlist/
    watchlist.module.ts
    watchlist.controller.ts  ← /api/watchlist/*
    watchlist.service.ts

  portfolio/
    portfolio.module.ts
    portfolio.controller.ts  ← /api/portfolio/*
    portfolio.service.ts

  screener/
    screener.module.ts
    screener.controller.ts   ← /api/screener/*
    screener.service.ts

  app.module.ts
  main.ts
```

### Multi-Tenancy Pattern

Every authenticated request carries `orgId` extracted from the JWT payload.
A `TenantContextMiddleware` injects `orgId` into the request object.
All service methods accept and filter by `orgId` — no cross-tenant data access possible.

```typescript
// Every service method follows this pattern:
async getPortfolio(userId: string, orgId: string) {
  return this.prisma.portfolio.findMany({
    where: { userId, orgId }   // orgId always enforced
  })
}
```

### Authentication Flow

```
POST /api/auth/login
    │
    ├── Validate email/password (bcrypt compare)
    ├── Generate access token (JWT, 15min, contains { sub, orgId, role })
    ├── Generate refresh token (random UUID, hash + store in DB, 7 days)
    └── Set refresh token in httpOnly cookie

POST /api/auth/refresh
    ├── Read refresh token from cookie
    ├── Validate against hashed value in DB
    ├── Generate new access token
    ├── Rotate refresh token (new value, old invalidated)
    └── Return new access token

All protected routes:
    ├── JwtAuthGuard validates Bearer token
    └── RolesGuard checks role against @Roles() decorator
```

---

## NSE Data Layer Architecture

### Data Flow

```
@Cron (every N seconds)
    │
    ├── MarketHoursService.isMarketOpen()? → false: skip (no-op)
    │
    ├── NseClientService
    │       ├── Circuit open? → return null immediately
    │       ├── Call stock-nse-india
    │       │       └── NSE public API (nseindia.com)
    │       ├── Success → reset failure count
    │       └── Failure → increment count, exponential backoff
    │
    └── CacheService.set(key, dto, ttl) → Azure Redis

GET /api/market/**
    └── MarketService → CacheService.get(key) → Redis
            └── { data, meta: { stale, asOf, marketPhase } }
```

### Circuit Breaker

```
Normal:  Req → NSE → Success → reset failures
Fail 1:  Req → NSE → Fail → wait 2s
Fail 2:  Req → NSE → Fail → wait 4s
Fail 3:  Req → NSE → Fail → CIRCUIT OPEN (2 minutes)
Open:    All calls → null immediately (stale cache served)
After 2min: Probe → Success → CLOSED | Fail → reset 2min timer
```

### Cache Keys

```
nse:equity:quote:<SYMBOL>       TTL 30s
nse:equity:quote:__all__        TTL 30s
nse:index:quote:<INDEX>         TTL 20s
nse:index:quote:__all__         TTL 20s
nse:options:chain:<SYMBOL>      TTL 120s
nse:market:gainers              TTL 60s
nse:market:losers               TTL 60s
nse:market:status               TTL 120s
nse:poll:ts:<job>               TTL 300s  (last poll timestamp)
```

---

## Frontend Architecture

### Application Structure

```
frontend/
  app/                          ← Next.js App Router
    (auth)/
      login/page.tsx
      register/page.tsx
    (protected)/
      layout.tsx                ← Auth check + nav shell
      dashboard/page.tsx
      watchlist/page.tsx
      portfolio/page.tsx
      screener/page.tsx
  components/
    market/
      IndexBar.tsx
      MarketStatusBadge.tsx
      TopMovers.tsx
    portfolio/
      HoldingsTable.tsx
      PnLSummary.tsx
    watchlist/
      WatchlistTable.tsx
    screener/
      FilterPanel.tsx
      ResultsTable.tsx
    ui/                         ← reusable primitives
  hooks/
    useAuth.ts
    useMarketData.ts
    usePolling.ts
  lib/
    api.ts                      ← Axios instance + interceptors
    auth.ts                     ← token management
  stores/
    auth.store.ts               ← Zustand auth state
```

### Frontend Data Fetching Strategy

| Data Type | Strategy | Why |
|-----------|---------|-----|
| Market data (indices, quotes) | React Query + 15s refetch interval | Live updates without WebSocket |
| Auth state | Zustand store | Client-side only, no server round-trip |
| Portfolio/Watchlist | React Query + manual invalidation | Updated on user action |
| Screener results | React Query + on-demand | Heavy query, only on filter change |

### API Client

All backend requests go through a single Axios instance:
- Base URL from `NEXT_PUBLIC_API_URL` env variable
- Request interceptor: attach `Authorization: Bearer <token>` header
- Response interceptor: on 401, call `/api/auth/refresh` → retry original request → on second 401, redirect to login

---

## Security Architecture

### Defense in Depth

| Layer | Control |
|-------|---------|
| Network | CORS whitelist (frontend domain only), no direct DB public access |
| Transport | TLS everywhere — HTTPS on App Services, TLS on Redis (port 6380), SSL on PostgreSQL |
| Application | Helmet.js headers, input validation on all endpoints, rate limiting |
| Authentication | JWT (short-lived access tokens), httpOnly cookies for refresh tokens |
| Authorization | RBAC (admin/viewer) + tenant isolation on every DB query |
| Data | Bcrypt password hashing (12 rounds), secrets in Azure Key Vault |
| Audit | Append-only `audit_log` for all mutations |

### Rate Limiting

```
@nestjs/throttler + Redis store
Limits:
  - Anonymous endpoints: 20 req/min per IP
  - Authenticated endpoints: 100 req/min per user
  - Auth endpoints (login/register): 10 req/min per IP
```

---

## Observability

### Monitoring Stack

| Tool | Purpose |
|------|---------|
| Application Insights | Request tracing, dependency tracking, exception logging |
| Azure Monitor | Infrastructure metrics (CPU, memory, DB connections) |
| Sentry | Error tracking with source maps, release tracking |

### Logging Format (structured JSON)

```json
{
  "timestamp": "2026-08-19T09:30:00.000Z",
  "level": "info",
  "message": "HTTP request",
  "method": "GET",
  "path": "/api/portfolio",
  "statusCode": 200,
  "duration": 45,
  "orgId": "org_abc123",
  "userId": "usr_xyz789",
  "requestId": "req_def456"
}
```

---

## Deployment Pipeline

```
Developer pushes to feature branch
    │
    ▼
GitHub Actions — PR Pipeline
    ├── npm run lint
    ├── npm run type-check
    └── npm run test

Merge to main
    ├── Backend:
    │   ├── Build NestJS app
    │   ├── Run Prisma migrations (staging DB)
    │   ├── Deploy to staging slot
    │   ├── Health check probe
    │   └── Swap staging → production (zero downtime)
    │
    └── Frontend:
        ├── Build Next.js app
        └── Deploy to App Service
```

---

## Cost Estimate (< 1K users)

| Service | Tier | Est. Monthly (USD) |
|---------|------|-------------------|
| App Service — Backend | B2 | ~$55 |
| App Service — Frontend | B1 | ~$14 |
| PostgreSQL Flexible Server | B2ms | ~$35 |
| Azure Cache for Redis | C1 Basic | ~$16 |
| Azure Key Vault | Standard | ~$5 |
| Application Insights | Pay-per-use | ~$10 |
| **Total** | | **~$135/month** |

---

## Scaling Path

```
Phase 1 (< 1K users): Current architecture
Phase 2 (10K users):
  - Upgrade App Service to P2v3
  - Add PostgreSQL read replica
  - Upgrade Redis to C2 Standard
Phase 3 (100K users):
  - Extract NSE polling → dedicated background App Service
  - Add Azure CDN for frontend
  - Consider splitting into microservices
```

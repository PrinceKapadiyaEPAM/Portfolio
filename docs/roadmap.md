# Project Roadmap & Milestones
**Project:** SaaS FinTech Platform — NSE Market Data
**Last Updated:** 2026-08-19
**Timeline:** Flexible / Quality-first

---

## Overview

Multi-tenant SaaS web platform providing NSE market data, portfolio tracking, and stock screening.
7 milestones from infrastructure setup to production readiness.

---

## Milestone Summary

| # | Milestone | Key Deliverable | Dependencies |
|---|-----------|----------------|-------------|
| M1 | Foundation & Infrastructure | Deployable skeleton + CI/CD | None |
| M2 | Auth & Multi-Tenancy | JWT auth + org isolation | M1 |
| M3 | NSE Market Data Layer | Polling + Redis + Market APIs | M1 |
| M4 | Market Dashboard | Live indices/movers UI | M2, M3 |
| M5 | Portfolio & Watchlist | Stock tracking + P&L | M2, M3 |
| M6 | Stock Screener | Filter + save presets | M3 |
| M7 | Production Readiness | Monitoring, security, hardening | M4, M5, M6 |

---

## Milestone 1 — Foundation & Infrastructure

**Goal:** Working skeleton, both apps deployable to Azure, CI/CD pipeline running.

### Tasks

**Project Scaffolding**
- [ ] Scaffold NestJS backend: `nest new backend`
- [ ] Scaffold Next.js frontend: `npx create-next-app frontend --typescript`
- [ ] Setup monorepo structure: single GitHub repo, `/backend` and `/frontend` folders
- [ ] Add root `package.json` with workspaces or scripts for both apps

**Backend Setup**
- [ ] Install and configure `@nestjs/config` with `.env` support
- [ ] Global validation pipe (`class-validator`)
- [ ] Global exception filter (structured error responses)
- [ ] Request logging middleware (method, path, status, duration)
- [ ] `GET /api/health` endpoint returning `{ status: 'ok', timestamp }`

**Frontend Setup**
- [ ] Configure TypeScript strict mode
- [ ] Setup Tailwind CSS or preferred UI library
- [ ] Layout component with navigation placeholder
- [ ] Environment config: `NEXT_PUBLIC_API_URL`

**Azure Infrastructure**
- [ ] Azure App Service — backend (Node.js 20, B2 plan)
- [ ] Azure App Service — frontend (Node.js 20, B1 plan)
- [ ] Azure Database for PostgreSQL Flexible Server (B2ms, 32GB storage)
- [ ] Azure Cache for Redis (C1 Basic, 1GB)
- [ ] Azure Key Vault (Standard tier)
- [ ] Wire Key Vault secret references into App Service configuration

**CI/CD (GitHub Actions)**
- [ ] PR pipeline: lint + TypeScript check + unit tests
- [ ] Backend deploy: build → deploy to staging slot → swap to production
- [ ] Frontend deploy: build → deploy to App Service
- [ ] Environment secrets stored in GitHub repository secrets

### Exit Criteria
- Both apps accessible via Azure App Service URLs
- Backend health check returns 200
- GitHub Actions pipeline green on merge to main

---

## Milestone 2 — Authentication & Multi-Tenant User Management

**Goal:** Secure JWT authentication with full multi-tenant data isolation.

### Data Model
```
Organization  1 ──< User
```

### Tasks

**Database**
- [ ] Setup ORM (Prisma recommended): `prisma init`
- [ ] Migration: `organizations` table
- [ ] Migration: `users` table
- [ ] Run migrations via CI/CD on deploy

**Auth Endpoints**
- [ ] `POST /api/auth/register` — creates organization + first admin user
- [ ] `POST /api/auth/login` — validates credentials, returns access token + sets refresh token cookie
- [ ] `POST /api/auth/refresh` — validates refresh token, rotates and returns new pair
- [ ] `POST /api/auth/logout` — clears refresh token from DB and cookie

**Auth Infrastructure**
- [ ] JWT access token: 15-minute expiry, signed with `JWT_SECRET` from Key Vault
- [ ] Refresh token: 7-day expiry, stored hashed in `users` table, sent as `httpOnly` `SameSite=Strict` cookie
- [ ] `JwtAuthGuard` — validates Bearer token on all protected routes
- [ ] `RolesGuard` + `@Roles()` decorator — enforces RBAC
- [ ] Tenant context middleware — extracts `orgId` from JWT, attaches to request
- [ ] All DB queries in protected modules filter by `orgId` from request context

**User Management**
- [ ] `GET /api/users/me` — current user profile
- [ ] `PATCH /api/users/me` — update name, preferences
- [ ] `POST /api/users/invite` — admin sends invite (creates inactive user, email placeholder)
- [ ] `GET /api/users` — admin lists all users in org

**Frontend**
- [ ] `/login` page with form
- [ ] `/register` page (org name + admin email/password)
- [ ] Auth context / React hook: `useAuth()`
- [ ] Axios interceptor: attach Bearer token, handle 401 → refresh → retry
- [ ] Protected route wrapper

### Exit Criteria
- Register new org, login, access protected endpoint
- Two separate orgs cannot access each other's data
- Refresh token rotation works without re-login

---

## Milestone 3 — NSE Market Data Layer

**Goal:** Reliable polling pipeline, Redis cache, REST APIs for frontend consumption.

### Data Source
`stock-nse-india` npm package — wraps NSE public endpoints, no auth required, polling only.

### Tasks

**NseClientService**
- [ ] Wrap `NseIndia` from `stock-nse-india`
- [ ] Implement circuit breaker: 3 failures → 2-minute open window, exponential backoff
- [ ] `fetchEquityQuote(symbol)`, `fetchAllIndices()`, `fetchEquityOptionChain(symbol)`, `fetchGainersLosers()`, `fetchMarketStatus()`
- [ ] All methods return `null` on failure (never throw to callers)

**CacheService (ioredis)**
- [ ] Direct `ioredis` client — TLS + keyPrefix configured for Azure Cache for Redis
- [ ] `get<T>`, `set<T>`, `del`, `ttl`, `exists`
- [ ] Swallow Redis errors internally, return `null` on get failures
- [ ] All keys prefixed with `REDIS_KEY_PREFIX` env var

**MarketHoursService**
- [ ] `isMarketOpen()` — IST 9:15–15:30, Monday–Friday (luxon)
- [ ] `marketPhase()` — returns `'open' | 'pre-open' | 'closed' | 'weekend'`

**Polling (5 pollers via `@nestjs/schedule`)**
- [ ] `EquityQuotesPoller` — every 15s, watched symbols from env
- [ ] `IndicesPoller` — every 10s, NIFTY 50 + NIFTY BANK + SENSEX
- [ ] `OptionsChainPoller` — every 60s, NIFTY + BANKNIFTY
- [ ] `GainersLosersPoller` — every 30s
- [ ] `MarketStatusPoller` — every 60s (no market hours gate)
- [ ] 30-second delayed warm-up on `onModuleInit` (prevents boot hammering)
- [ ] `Promise.allSettled` for fan-out (one symbol failure doesn't block others)

**REST API**
- [ ] `GET /api/market/status`
- [ ] `GET /api/market/indices`
- [ ] `GET /api/market/indices/:index`
- [ ] `GET /api/market/quotes`
- [ ] `GET /api/market/quotes/:symbol`
- [ ] `GET /api/market/options/:symbol`
- [ ] `GET /api/market/movers?type=gainers|losers`

**Polling Intervals & Cache TTLs**

| Data | Poll Interval | Cache TTL |
|------|-------------|----------|
| Equity quotes | 15s | 30s |
| Indices | 10s | 20s |
| Options chain | 60s | 120s |
| Gainers/losers | 30s | 60s |
| Market status | 60s | 120s |

### Exit Criteria
- All `/api/market/**` endpoints return data during market hours
- Stale cache served (no errors) outside market hours
- Circuit breaker tested: NSE unavailable → null returned → stale cache served

---

## Milestone 4 — Market Dashboard (Frontend)

**Goal:** Authenticated dashboard with live market overview, auto-refreshing every 15 seconds.

### Tasks

**Components**
- [ ] `<IndexBar />` — horizontal bar showing NIFTY 50, NIFTY BANK, SENSEX with LTP + change%
- [ ] `<MarketStatusBadge />` — colored pill: green (open), amber (pre-open), red (closed)
- [ ] `<TopMovers />` — two columns: top 5 gainers, top 5 losers with change%
- [ ] `<WatchlistWidget />` — compact watchlist preview (links to full watchlist page)

**Pages**
- [ ] `/dashboard` (authenticated) — IndexBar + MarketStatus + TopMovers + WatchlistWidget

**Frontend Polling**
- [ ] `useMarketData()` hook — `setInterval` every 15s, fetches indices + quotes
- [ ] Optimistic UI: show previous data while refreshing (no full spinner on poll)
- [ ] Stop polling when tab is hidden (`document.visibilityState`)

### Exit Criteria
- Dashboard renders with live data
- Refreshes every 15s without full page reload
- Shows closed/stale state cleanly outside market hours

---

## Milestone 5 — Portfolio & Watchlist

**Goal:** Per-user, per-tenant stock tracking with live P&L.

### Data Model
```
Watchlist 1──< WatchlistItem (symbol)
Portfolio 1──< Holding      (symbol, qty, avg_buy_price, buy_date)
```

### Tasks

**Database**
- [ ] Migration: `watchlists`, `watchlist_items`
- [ ] Migration: `portfolios`, `holdings`

**Watchlist API**
- [ ] `GET /api/watchlist` — returns items enriched with live LTP from Redis
- [ ] `POST /api/watchlist/items` — add symbol (validate symbol exists via NSE cache)
- [ ] `DELETE /api/watchlist/items/:symbol`

**Portfolio API**
- [ ] `GET /api/portfolio` — holdings with `current_value`, `pnl`, `pnl_pct` computed server-side
- [ ] `POST /api/portfolio/holdings` — add holding
- [ ] `PATCH /api/portfolio/holdings/:id` — edit qty or avg price
- [ ] `DELETE /api/portfolio/holdings/:id`
- [ ] P&L formula: `(ltp - avg_buy_price) * qty`; ltp from Redis

**Frontend**
- [ ] `/watchlist` — table: symbol, LTP, change%, action (remove). Add symbol input.
- [ ] `/portfolio` — table: symbol, qty, avg price, LTP, current value, P&L, P&L%. Total row.

### Exit Criteria
- Watchlist and portfolio data is isolated per org
- Live P&L calculated correctly using Redis LTP

---

## Milestone 6 — Stock Screener

**Goal:** Filter all NSE stocks by multiple criteria, save presets per org.

### Tasks

**Screener Data**
- [ ] Daily scheduled job (midnight IST): fetch all NSE equity list, store snapshot in `market_snapshot` table
- [ ] Snapshot columns: symbol, sector, ltp, change_pct, volume, week52_high, week52_low, market_cap (where available)

**Screener API**
- [ ] `GET /api/screener/results` — query params: `change_gt`, `change_lt`, `volume_gt`, `week52_high_pct_lt`, `sector`
- [ ] Dynamic SQL filter built safely via Prisma/TypeORM query builder (no raw string concatenation)
- [ ] `GET /api/screener/presets` — org's saved presets
- [ ] `POST /api/screener/presets` — save current filter as named preset
- [ ] `DELETE /api/screener/presets/:id`

**Frontend**
- [ ] `/screener` — filter sidebar + sortable results table
- [ ] Save/load preset dropdown
- [ ] Export results as CSV (client-side)

### Exit Criteria
- Screener returns filtered, sorted results
- Presets saved and reloaded correctly per org
- No SQL injection possible via filter params

---

## Milestone 7 — Production Readiness

**Goal:** Observable, hardened, ready for real users.

### Tasks

**Observability**
- [ ] Application Insights SDK in NestJS (custom events, dependencies, exceptions)
- [ ] Application Insights in Next.js (page views, client errors)
- [ ] Structured JSON logging: every request logs `{ method, path, status, duration, orgId, userId }`
- [ ] Sentry error tracking in both apps (source maps uploaded in CI)

**Security**
- [ ] Helmet.js on NestJS (security headers)
- [ ] CORS: whitelist frontend domain only
- [ ] Rate limiting: `@nestjs/throttler` backed by Redis — 100 req/min per user
- [ ] All secrets in Azure Key Vault (no plaintext in App Service settings)
- [ ] PostgreSQL: SSL required, accessible only from backend App Service VNet
- [ ] Redis: TLS port 6380, no public endpoint
- [ ] Audit log: every CREATE/UPDATE/DELETE writes to `audit_log` table

**Reliability**
- [ ] Azure Backup: daily automated PostgreSQL snapshots, 7-day retention
- [ ] App Service health check configured (probes `/api/health`)
- [ ] Deployment slot: staging → production swap (zero downtime)

**Testing**
- [ ] Load test with k6: 50 concurrent users on `/dashboard` endpoints
- [ ] Verify Redis TTL strategy holds under load
- [ ] Verify tenant isolation under load (cross-org data leakage test)

### Exit Criteria
- Application Insights dashboard live with request metrics
- All secrets in Key Vault
- Load test passes at 50 concurrent users
- Zero cross-tenant data access possible

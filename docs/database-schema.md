# Database Schema
**Project:** SaaS FinTech Platform — NSE Market Data
**Database:** PostgreSQL (Azure DB for PostgreSQL Flexible Server)
**ORM:** Prisma
**Last Updated:** 2026-08-19

---

## Schema Overview

```
organizations ──< users
users         ──< watchlists ──< watchlist_items
users         ──< portfolios ──< holdings
organizations ──< screener_presets
               market_snapshot  (system-level, no org FK)
               audit_log        (org + user context)
```

---

## Tables

---

### `organizations`
Multi-tenant root. Every user belongs to one organization.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `VARCHAR(26)` | PK | ULID — prefixed `org_` |
| `name` | `VARCHAR(100)` | NOT NULL | Display name |
| `slug` | `VARCHAR(50)` | NOT NULL, UNIQUE | URL-safe identifier |
| `plan` | `VARCHAR(20)` | NOT NULL, DEFAULT `'free'` | `free`, `pro`, `enterprise` |
| `is_active` | `BOOLEAN` | NOT NULL, DEFAULT `true` | Soft-disable tenant |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

**Indexes:**
- `UNIQUE (slug)`

---

### `users`
Platform users. Each user belongs to exactly one organization.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `VARCHAR(26)` | PK | ULID — prefixed `usr_` |
| `org_id` | `VARCHAR(26)` | NOT NULL, FK → `organizations.id` | Tenant |
| `email` | `VARCHAR(255)` | NOT NULL | |
| `password_hash` | `VARCHAR(255)` | NOT NULL | bcrypt (12 rounds) |
| `name` | `VARCHAR(100)` | | Display name |
| `role` | `VARCHAR(20)` | NOT NULL, DEFAULT `'viewer'` | `admin`, `manager`, `viewer` |
| `is_active` | `BOOLEAN` | NOT NULL, DEFAULT `true` | |
| `refresh_token_hash` | `VARCHAR(255)` | NULLABLE | Hashed current refresh token |
| `refresh_token_expires_at` | `TIMESTAMPTZ` | NULLABLE | Expiry of current refresh token |
| `last_login_at` | `TIMESTAMPTZ` | NULLABLE | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

**Indexes:**
- `UNIQUE (org_id, email)` — email unique within org
- `INDEX (org_id)`

---

### `watchlists`
Named watchlists per user. A user can have multiple watchlists.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `VARCHAR(26)` | PK | ULID |
| `user_id` | `VARCHAR(26)` | NOT NULL, FK → `users.id` | Owner |
| `org_id` | `VARCHAR(26)` | NOT NULL, FK → `organizations.id` | Tenant (for efficient filtering) |
| `name` | `VARCHAR(100)` | NOT NULL | Display name for the watchlist
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

**Indexes:**
- `UNIQUE (user_id, name)` — watchlist names are unique per user
- `INDEX (user_id)`
- `INDEX (org_id)`

---

### `watchlist_items`
Individual stock symbols in a watchlist.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `VARCHAR(26)` | PK | ULID |
| `watchlist_id` | `VARCHAR(26)` | NOT NULL, FK → `watchlists.id` | |
| `symbol` | `VARCHAR(20)` | NOT NULL | NSE symbol, e.g. `RELIANCE` |
| `notes` | `TEXT` | NULLABLE | User notes on this symbol |
| `added_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

**Indexes:**
- `UNIQUE (watchlist_id, symbol)` — no duplicate symbols per watchlist
- `INDEX (watchlist_id)`

---

### `portfolios`
Named portfolios per user.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `VARCHAR(26)` | PK | ULID |
| `user_id` | `VARCHAR(26)` | NOT NULL, FK → `users.id` | |
| `org_id` | `VARCHAR(26)` | NOT NULL, FK → `organizations.id` | |
| `name` | `VARCHAR(100)` | NOT NULL, DEFAULT `'My Portfolio'` | |
| `is_default` | `BOOLEAN` | NOT NULL, DEFAULT `false` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

**Indexes:**
- `INDEX (user_id)`
- `INDEX (org_id)`

---

### `holdings`
Individual stock holdings within a portfolio.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `VARCHAR(26)` | PK | ULID |
| `portfolio_id` | `VARCHAR(26)` | NOT NULL, FK → `portfolios.id` | |
| `symbol` | `VARCHAR(20)` | NOT NULL | NSE symbol |
| `quantity` | `NUMERIC(15,4)` | NOT NULL | Supports fractional shares |
| `avg_buy_price` | `NUMERIC(15,4)` | NOT NULL | Average purchase price (INR) |
| `buy_date` | `DATE` | NULLABLE | Date of purchase |
| `notes` | `TEXT` | NULLABLE | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

**Indexes:**
- `INDEX (portfolio_id)`
- `INDEX (symbol)` — for screener enrichment queries

**Notes:**
- P&L is NOT stored — computed at query time: `(ltp - avg_buy_price) * quantity`
- `ltp` comes from Redis at serve time, not from the DB

---

### `screener_presets`
Saved screener filter configurations per org.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `VARCHAR(26)` | PK | ULID |
| `org_id` | `VARCHAR(26)` | NOT NULL, FK → `organizations.id` | |
| `user_id` | `VARCHAR(26)` | NOT NULL, FK → `users.id` | Creator |
| `name` | `VARCHAR(100)` | NOT NULL | Preset display name |
| `filters` | `JSONB` | NOT NULL | Filter criteria (see below) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

**Indexes:**
- `INDEX (org_id)`
- `INDEX (user_id)`

**`filters` JSONB shape:**
```json
{
  "change_gt": 2.5,
  "change_lt": null,
  "volume_gt": 500000,
  "week52_high_pct_lt": 5,
  "sector": "NIFTY IT",
  "sort_by": "change_pct",
  "sort_dir": "desc"
}
```

---

### `market_snapshot`
Daily EOD snapshot of all NSE equities. Used by the screener.
Refreshed once per day at market close (15:45 IST).

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `VARCHAR(26)` | PK | ULID |
| `symbol` | `VARCHAR(20)` | NOT NULL | NSE symbol |
| `company_name` | `VARCHAR(200)` | | |
| `sector` | `VARCHAR(100)` | NULLABLE | Index/sector membership |
| `ltp` | `NUMERIC(15,4)` | NOT NULL | Last traded price |
| `open` | `NUMERIC(15,4)` | | |
| `high` | `NUMERIC(15,4)` | | |
| `low` | `NUMERIC(15,4)` | | |
| `prev_close` | `NUMERIC(15,4)` | | |
| `change_pct` | `NUMERIC(8,4)` | | Day change percentage |
| `volume` | `BIGINT` | | |
| `week52_high` | `NUMERIC(15,4)` | NULLABLE | |
| `week52_low` | `NUMERIC(15,4)` | NULLABLE | |
| `market_cap` | `NUMERIC(20,4)` | NULLABLE | In crores (INR) |
| `snapped_at` | `TIMESTAMPTZ` | NOT NULL | When this snapshot was taken |

**Indexes:**
- `INDEX (symbol, snapped_at DESC)` — latest snapshot per symbol
- `INDEX (snapped_at)` — for cleanup of old snapshots
- `INDEX (sector)` — screener sector filter
- `INDEX (change_pct)` — screener sort
- `INDEX (volume)` — screener filter

**Retention:** Keep 7 days of snapshots. Older rows deleted by a nightly cleanup job.

---

### `audit_log`
Append-only immutable log of all data mutations.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `VARCHAR(26)` | PK | ULID |
| `org_id` | `VARCHAR(26)` | NOT NULL | Tenant context |
| `user_id` | `VARCHAR(26)` | NULLABLE | Null for system actions |
| `action` | `VARCHAR(50)` | NOT NULL | `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT` |
| `entity` | `VARCHAR(50)` | NOT NULL | e.g. `holding`, `watchlist_item`, `user` |
| `entity_id` | `VARCHAR(26)` | NULLABLE | ID of affected record |
| `payload` | `JSONB` | NULLABLE | Changed fields (new values only) |
| `ip_address` | `VARCHAR(45)` | NULLABLE | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

**Indexes:**
- `INDEX (org_id, created_at DESC)`
- `INDEX (user_id, created_at DESC)`
- `INDEX (entity, entity_id)` — look up history of a specific record

**Constraint:** No UPDATE or DELETE permissions granted on this table to the application DB user.

---

## Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Organization {
  id        String   @id @default(cuid())
  name      String   @db.VarChar(100)
  slug      String   @unique @db.VarChar(50)
  plan      String   @default("free") @db.VarChar(20)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users           User[]
  watchlists      Watchlist[]
  portfolios      Portfolio[]
  screenerPresets ScreenerPreset[]
  auditLogs       AuditLog[]

  @@map("organizations")
}

model User {
  id                    String    @id @default(cuid())
  orgId                 String    @db.VarChar(26)
  email                 String    @db.VarChar(255)
  passwordHash          String    @db.VarChar(255)
  name                  String?   @db.VarChar(100)
  role                  String    @default("viewer") @db.VarChar(20)
  isActive              Boolean   @default(true)
  refreshTokenHash      String?   @db.VarChar(255)
  refreshTokenExpiresAt DateTime?
  lastLoginAt           DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  org             Organization     @relation(fields: [orgId], references: [id])
  watchlists      Watchlist[]
  portfolios      Portfolio[]
  screenerPresets ScreenerPreset[]
  auditLogs       AuditLog[]

  @@unique([orgId, email])
  @@index([orgId])
  @@map("users")
}

model Watchlist {
  id        String   @id @default(cuid())
  userId    String   @db.VarChar(26)
  orgId     String   @db.VarChar(26)
  name      String   @default("My Watchlist") @db.VarChar(100)
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user  User            @relation(fields: [userId], references: [id])
  org   Organization    @relation(fields: [orgId], references: [id])
  items WatchlistItem[]

  @@index([userId])
  @@index([orgId])
  @@map("watchlists")
}

model WatchlistItem {
  id          String   @id @default(cuid())
  watchlistId String   @db.VarChar(26)
  symbol      String   @db.VarChar(20)
  notes       String?
  addedAt     DateTime @default(now())

  watchlist Watchlist @relation(fields: [watchlistId], references: [id], onDelete: Cascade)

  @@unique([watchlistId, symbol])
  @@index([watchlistId])
  @@map("watchlist_items")
}

model Portfolio {
  id        String   @id @default(cuid())
  userId    String   @db.VarChar(26)
  orgId     String   @db.VarChar(26)
  name      String   @default("My Portfolio") @db.VarChar(100)
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user     User      @relation(fields: [userId], references: [id])
  org      Organization @relation(fields: [orgId], references: [id])
  holdings Holding[]

  @@index([userId])
  @@index([orgId])
  @@map("portfolios")
}

model Holding {
  id           String   @id @default(cuid())
  portfolioId  String   @db.VarChar(26)
  symbol       String   @db.VarChar(20)
  quantity     Decimal  @db.Decimal(15, 4)
  avgBuyPrice  Decimal  @db.Decimal(15, 4)
  buyDate      DateTime? @db.Date
  notes        String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  portfolio Portfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)

  @@index([portfolioId])
  @@index([symbol])
  @@map("holdings")
}

model ScreenerPreset {
  id        String   @id @default(cuid())
  orgId     String   @db.VarChar(26)
  userId    String   @db.VarChar(26)
  name      String   @db.VarChar(100)
  filters   Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  org  Organization @relation(fields: [orgId], references: [id])
  user User         @relation(fields: [userId], references: [id])

  @@index([orgId])
  @@index([userId])
  @@map("screener_presets")
}

model MarketSnapshot {
  id          String   @id @default(cuid())
  symbol      String   @db.VarChar(20)
  companyName String?  @db.VarChar(200)
  sector      String?  @db.VarChar(100)
  ltp         Decimal  @db.Decimal(15, 4)
  open        Decimal? @db.Decimal(15, 4)
  high        Decimal? @db.Decimal(15, 4)
  low         Decimal? @db.Decimal(15, 4)
  prevClose   Decimal? @db.Decimal(15, 4)
  changePct   Decimal? @db.Decimal(8, 4)
  volume      BigInt?
  week52High  Decimal? @db.Decimal(15, 4)
  week52Low   Decimal? @db.Decimal(15, 4)
  marketCap   Decimal? @db.Decimal(20, 4)
  snappedAt   DateTime

  @@index([symbol, snappedAt(sort: Desc)])
  @@index([snappedAt])
  @@index([sector])
  @@index([changePct])
  @@index([volume])
  @@map("market_snapshot")
}

model AuditLog {
  id        String   @id @default(cuid())
  orgId     String   @db.VarChar(26)
  userId    String?  @db.VarChar(26)
  action    String   @db.VarChar(50)
  entity    String   @db.VarChar(50)
  entityId  String?  @db.VarChar(26)
  payload   Json?
  ipAddress String?  @db.VarChar(45)
  createdAt DateTime @default(now())

  org  Organization @relation(fields: [orgId], references: [id])
  user User?        @relation(fields: [userId], references: [id])

  @@index([orgId, createdAt(sort: Desc)])
  @@index([userId, createdAt(sort: Desc)])
  @@index([entity, entityId])
  @@map("audit_log")
}
```

---

## Migration Strategy

- All schema changes via Prisma migrations (`prisma migrate dev`)
- Migrations run automatically in CI/CD before app deployment
- Production: `prisma migrate deploy` (no interactive prompts)
- Destructive migrations (column drops, table drops) require manual review + backup before running

## Connection Configuration

```
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<db>?sslmode=require&connection_limit=10
```

- `sslmode=require` — enforced for Azure PostgreSQL
- `connection_limit=10` — appropriate for B2 App Service plan (avoids connection pool exhaustion)
- Prisma manages connection pooling internally; no PgBouncer needed at this scale

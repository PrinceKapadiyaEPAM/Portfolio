# SOP: New Environment Setup

**System:** NSE Stock Strategy Portfolio Platform  
**Stack:** NestJS + Next.js + PostgreSQL + Redis  
**Last updated:** 2026-08-21

---

## Prerequisites

Install the following before starting:

| Tool | Version | Check |
|---|---|---|
| Node.js | 20.x LTS | `node --version` |
| npm | 10.x+ | `npm --version` |
| Git | 2.x+ | `git --version` |
| PostgreSQL client | 15+ | `psql --version` (optional, for manual DB access) |

You also need access to:
- The GitHub repository
- Azure subscription (for production) **or** a local PostgreSQL instance (for development)
- Redis instance (optional for dev, required for production)

---

## 1. Clone and Install

```bash
git clone <repo-url>
cd Portfolio
npm install            # installs root devDependencies
cd backend && npm install
cd ../frontend && npm install
```

---

## 2. Database Setup

### 2a. Local Development (PostgreSQL)

Create a database:

```bash
psql -U postgres
CREATE DATABASE portfolio_dev;
CREATE USER portfolio_user WITH ENCRYPTED PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE portfolio_dev TO portfolio_user;
\q
```

Your `DATABASE_URL` will be:
```
postgresql://portfolio_user:yourpassword@localhost:5432/portfolio_dev
```

### 2b. Azure PostgreSQL (Production)

- Provision **Azure DB for PostgreSQL Flexible Server** (B2ms, Multi-AZ recommended)
- Enable SSL: set `sslmode=require` in the connection string
- Whitelist your backend's outbound IP under **Networking → Firewall rules**
- Connection string format:
  ```
  postgresql://adminuser:password@<server>.postgres.database.azure.com:5432/portfolio?sslmode=require
  ```

---

## 3. Redis Setup (Optional for Dev, Required for Production)

### 3a. Local Development

Redis is **disabled by default**. Set `REDIS_ENABLED=false` in `.env` to skip it entirely.

To run Redis locally with Docker:
```bash
docker run -d -p 6379:6379 --name redis-local redis:7
```
Then set `REDIS_HOST=localhost`, `REDIS_PORT=6379`, `REDIS_ENABLED=true`.

### 3b. Azure Cache for Redis (Production)

- Provision **Azure Cache for Redis C1 Basic (1GB)**
- Enable TLS (port 6380)
- Get the access key from **Settings → Access keys**

---

## 4. Environment Variables

### Backend

Copy the example file and fill in values:

```bash
cd backend
cp .env.example .env
```

Minimum required variables:

```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Required
DATABASE_URL=postgresql://portfolio_user:yourpassword@localhost:5432/portfolio_dev
JWT_SECRET=replace-with-64-byte-hex-string-min-16-chars

# Optional (Redis)
REDIS_ENABLED=false
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=
# REDIS_TLS=false

# Optional (NSE polling)
NSE_POLL_ENABLED=true
NSE_WATCH_SYMBOLS=RELIANCE,TCS,INFY,HDFCBANK,ICICIBANK
NSE_OPTION_SYMBOLS=NIFTY,BANKNIFTY

# Optional (Sentry - leave blank to disable)
SENTRY_DSN=

# Seed accounts (used only at seed time)
SUPERADMIN_EMAIL=superadmin@demo.com
SUPERADMIN_PASSWORD=Super@1234
```

Generate a secure `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
```

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api

# Optional (Sentry)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

---

## 5. Database Migrations

All migrations must be run from the `backend/` directory.

### 5a. Apply All Migrations (New Environment)

```bash
cd backend
npx prisma migrate deploy
```

This applies all pending migrations from `prisma/migrations/` in order. Use `migrate deploy` (not `migrate dev`) for any non-local environment (staging, production).

### 5b. Verify Migration Status

```bash
npx prisma migrate status
```

All migrations should show **Applied**.

### 5c. Regenerate Prisma Client

Run this after any schema or migration change:

```bash
npx prisma generate
```

This is also run automatically during `npm install` via the `postinstall` script.

### 5d. Migration History

| Migration | Description |
|---|---|
| `20260819100751_init` | Initial schema — all base tables |
| ... (14 total) | See `backend/prisma/migrations/` for full list |
| `20260819151256_allow_manual_transactions` | Allow manual trade transactions |

---

## 6. Seed the Database

Seeding creates a demo org and default user accounts. Run **once** per new environment:

```bash
cd backend
npm run seed
```

This creates:

| Account | Email | Password | Role |
|---|---|---|---|
| Demo Admin | `admin@demo.com` | `Demo@1234` | admin |
| Superadmin | `superadmin@demo.com` | `Super@1234` | superadmin |

Superadmin credentials can be overridden via `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` env vars.

> The seed script is idempotent — safe to re-run; skips if already seeded.

---

## 7. Build

### Backend

```bash
cd backend
npm run build
# Outputs compiled JS to backend/dist/
```

### Frontend

```bash
cd frontend
npm run build
# Produces .next/ production build
```

---

## 8. Start the Application

### Development (with hot reload)

From repo root:

```bash
npm run dev:backend    # NestJS on :4000 with --watch
npm run dev:frontend   # Next.js on :3000
```

Or from individual directories:
```bash
# Terminal 1
cd backend && npm run start:dev

# Terminal 2
cd frontend && npm run dev
```

### Production

```bash
# Backend
cd backend && npm run start:prod   # node dist/main

# Frontend
cd frontend && npm run start       # next start
```

---

## 9. Verify the Setup

1. **Health check** — no auth required:
   ```
   GET http://localhost:4000/api/health
   ```
   Expected: `{ "status": "ok" }`

2. **Login** with the seeded admin account:
   ```
   POST http://localhost:4000/api/auth/login
   { "email": "admin@demo.com", "password": "Demo@1234" }
   ```
   Expected: access token + httpOnly refresh cookie

3. Open `http://localhost:3000` in a browser and log in.

---

## 10. CI/CD (GitHub Actions)

Three workflows run automatically:

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | PR to `main` | Lint + unit tests |
| `deploy-backend.yml` | Push to `main` | Build + deploy to Azure App Service (backend) |
| `deploy-frontend.yml` | Push to `main` | Build + deploy to Azure App Service (frontend) |

### Required GitHub Secrets

Set these under **Settings → Secrets → Actions**:

| Secret | Description |
|---|---|
| `AZURE_BACKEND_APP_NAME` | Azure App Service name for backend |
| `AZURE_BACKEND_PUBLISH_PROFILE` | Publish profile XML (download from Azure portal) |
| `AZURE_FRONTEND_APP_NAME` | Azure App Service name for frontend |
| `AZURE_FRONTEND_PUBLISH_PROFILE` | Publish profile XML |
| `AZURE_RESOURCE_GROUP` | Resource group name (for slot swap) |
| `NEXT_PUBLIC_API_URL` | Backend URL injected at frontend build time |

---

## 11. Production Environment Variables

Use the production example files as a reference:

```bash
cd backend && cp .env.production.example .env
cd frontend && cp .env.production.example .env.local
```

Key differences from development:

| Variable | Dev | Production |
|---|---|---|
| `NODE_ENV` | `development` | `production` |
| `DATABASE_URL` | local PostgreSQL | Azure PostgreSQL with `sslmode=require` |
| `REDIS_ENABLED` | `false` | `true` |
| `REDIS_TLS` | `false` | `true` |
| `REDIS_PORT` | `6379` | `6380` |
| `FRONTEND_URL` | `http://localhost:3000` | `https://your-app.azurewebsites.net` |
| `JWT_SECRET` | any string | 64-byte hex, stored in Azure Key Vault |
| `SENTRY_DSN` | blank | Sentry project DSN |

---

## 12. Running on a New Azure Environment

1. **Provision services** (in order):
   - Azure DB for PostgreSQL Flexible Server
   - Azure Cache for Redis
   - Azure App Service (backend, B2 plan, Node.js 20)
   - Azure App Service (frontend, B1 plan, Node.js 20)

2. **Configure App Service environment variables** via Azure portal → Configuration → Application settings (or Azure CLI):
   ```bash
   az webapp config appsettings set \
     --name <backend-app-name> \
     --resource-group <rg> \
     --settings DATABASE_URL="..." JWT_SECRET="..." NODE_ENV="production" ...
   ```

3. **Run migrations** from your local machine targeting the production DB:
   ```bash
   cd backend
   DATABASE_URL="postgresql://..." npx prisma migrate deploy
   ```

4. **Seed** (first time only):
   ```bash
   DATABASE_URL="postgresql://..." SUPERADMIN_EMAIL="..." SUPERADMIN_PASSWORD="..." npm run seed
   ```

5. **Set GitHub secrets** (see Section 10).

6. **Push to `main`** — GitHub Actions deploys both services automatically.

---

## 13. Common Issues and Fixes

| Issue | Cause | Fix |
|---|---|---|
| `P1001: Can't reach database server` | Wrong `DATABASE_URL` or firewall | Check connection string; whitelist IP in Azure firewall |
| `P3006: Migration failed` | Schema drift or applied out-of-order | Run `npx prisma migrate status` to identify; restore DB snapshot if needed |
| `CORS error in browser` | `FRONTEND_URL` mismatch | Set `FRONTEND_URL` to the exact frontend origin (no trailing slash) |
| `401 Unauthorized` on all requests | Expired token or wrong `JWT_SECRET` | Ensure same `JWT_SECRET` across restarts; re-login to get fresh tokens |
| Redis connection refused | `REDIS_ENABLED=true` but no Redis | Set `REDIS_ENABLED=false` for local dev without Redis |
| NSE data not updating | NSE circuit breaker is open | Check backend logs for `[NseCircuitBreaker]`; wait 2 minutes for auto-reset |
| `prisma generate` errors | Prisma Client out of sync | `cd backend && npx prisma generate` after any schema change |

---

## 14. Useful Commands Reference

```bash
# Prisma
npx prisma migrate dev          # create + apply new migration (dev only)
npx prisma migrate deploy       # apply pending migrations (staging/prod)
npx prisma migrate status       # show applied/pending migrations
npx prisma migrate reset        # DROP all tables + re-migrate (dev only, destructive)
npx prisma db seed              # run seed.ts
npx prisma studio               # open Prisma Studio GUI at localhost:5555
npx prisma generate             # regenerate Prisma Client

# Backend
npm run start:dev               # dev server with hot reload
npm run build                   # compile TypeScript
npm run test                    # unit tests
npm run test:e2e                # e2e tests

# Frontend
npm run dev                     # Next.js dev server
npm run build && npm run start  # production build + serve

# Load test (requires k6)
BASE_URL=http://localhost:4000/api JWT_TOKEN=<token> k6 run load-tests/dashboard.js
```

---

## 15. Seed Accounts Summary

| Role | Email | Password | Notes |
|---|---|---|---|
| Superadmin | `superadmin@demo.com` | `Super@1234` | Override via env vars |
| Admin | `admin@demo.com` | `Demo@1234` | Belongs to `demo-org` |

**Change these passwords immediately on any internet-facing environment.**

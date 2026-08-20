# API Reference
**Project:** SaaS FinTech Platform — NSE Market Data
**Base URL:** `https://<backend>.azurewebsites.net`
**Last Updated:** 2026-08-19

---

## Conventions

- All endpoints return `Content-Type: application/json`
- All timestamps are ISO 8601 UTC strings
- All monetary values are in INR (Indian Rupees)
- Authentication: `Authorization: Bearer <access_token>` header (except auth endpoints)
- Errors follow a consistent shape (see Error Responses)

### Response Envelope

All endpoints return:
```json
{
  "data": <payload or null>,
  "meta": {
    "timestamp": "2026-08-19T09:30:00.000Z"
  }
}
```

Market data endpoints include additional meta fields:
```json
{
  "data": <payload>,
  "meta": {
    "timestamp": "...",
    "cached": true,
    "stale": false,
    "asOf": "2026-08-19T09:29:55.000Z",
    "marketPhase": "open"
  }
}
```

### Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "symbol must be a non-empty string",
    "statusCode": 400
  }
}
```

### Error Codes
| HTTP Status | Code | Meaning |
|-------------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid request body or params |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Insufficient role |
| 404 | `NOT_FOUND` | Resource not found |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

---

## Authentication

### `POST /api/auth/register`
Register a new organization and admin user.

**Auth:** None

**Request:**
```json
{
  "orgName": "Acme Capital",
  "email": "admin@acme.com",
  "password": "SecurePass123!",
  "name": "Prince Kapadiya"
}
```

**Response `201`:**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr_01J5K...",
      "email": "admin@acme.com",
      "name": "Prince Kapadiya",
      "role": "admin",
      "orgId": "org_01J5K..."
    }
  }
}
```
Refresh token set as `httpOnly` cookie `rt`.

---

### `POST /api/auth/login`
Login with email and password.

**Auth:** None

**Request:**
```json
{
  "email": "admin@acme.com",
  "password": "SecurePass123!"
}
```

**Response `200`:**
```json
{
  "data": {
    "accessToken": "eyJhbGci...",
    "user": {
      "id": "usr_01J5K...",
      "email": "admin@acme.com",
      "name": "Prince Kapadiya",
      "role": "admin",
      "orgId": "org_01J5K..."
    }
  }
}
```
Refresh token set as `httpOnly` `SameSite=Strict` cookie `rt`.

---

### `POST /api/auth/refresh`
Exchange refresh token cookie for a new access token.

**Auth:** Refresh token cookie `rt`

**Response `200`:**
```json
{
  "data": {
    "accessToken": "eyJhbGci..."
  }
}
```
New refresh token set in cookie, old one invalidated.

---

### `POST /api/auth/logout`
Invalidate current refresh token.

**Auth:** Bearer token

**Response `200`:**
```json
{ "data": { "success": true } }
```

---

## Users

### `GET /api/users/me`
Get current authenticated user's profile.

**Auth:** Bearer token

**Response `200`:**
```json
{
  "data": {
    "id": "usr_01J5K...",
    "email": "admin@acme.com",
    "name": "Prince Kapadiya",
    "role": "admin",
    "orgId": "org_01J5K...",
    "orgName": "Acme Capital",
    "lastLoginAt": "2026-08-19T09:00:00.000Z",
    "createdAt": "2026-08-01T00:00:00.000Z"
  }
}
```

---

### `PATCH /api/users/me`
Update current user's profile.

**Auth:** Bearer token

**Request:**
```json
{
  "name": "Prince A. Kapadiya"
}
```

**Response `200`:**
```json
{
  "data": {
    "id": "usr_01J5K...",
    "name": "Prince A. Kapadiya",
    "email": "admin@acme.com"
  }
}
```

---

### `GET /api/users`
List all users in the organization. Admin only.

**Auth:** Bearer token | Role: `admin`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "usr_01J5K...",
      "email": "admin@acme.com",
      "name": "Prince Kapadiya",
      "role": "admin",
      "isActive": true,
      "lastLoginAt": "2026-08-19T09:00:00.000Z"
    }
  ]
}
```

---

### `POST /api/users/invite`
Invite a new user to the organization. Admin only.

**Auth:** Bearer token | Role: `admin`

**Request:**
```json
{
  "email": "analyst@acme.com",
  "name": "Ravi Sharma",
  "role": "viewer"
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "usr_02K6L...",
    "email": "analyst@acme.com",
    "role": "viewer",
    "isActive": false
  }
}
```

---

## Market Data

All market data is served from Redis cache. The `meta.stale` field indicates whether the cache is older than 2x the polling interval.

`marketPhase` values: `open` | `pre-open` | `closed` | `weekend`

---

### `GET /api/market/status`
Current market status and phase.

**Auth:** Bearer token

**Response `200`:**
```json
{
  "data": {
    "phase": "open",
    "isOpen": true,
    "currentTimeIST": "2026-08-19T09:35:00+05:30",
    "nextTransition": {
      "event": "close",
      "at": "2026-08-19T15:30:00+05:30",
      "inMinutes": 355
    }
  },
  "meta": {
    "cached": true,
    "stale": false,
    "asOf": "2026-08-19T09:34:00.000Z",
    "marketPhase": "open"
  }
}
```

---

### `GET /api/market/indices`
All tracked indices (NIFTY 50, NIFTY BANK, SENSEX).

**Auth:** Bearer token

**Response `200`:**
```json
{
  "data": [
    {
      "symbol": "NIFTY 50",
      "ltp": 24850.35,
      "open": 24700.00,
      "high": 24900.00,
      "low": 24650.00,
      "prevClose": 24720.50,
      "change": 129.85,
      "changePct": 0.53
    },
    {
      "symbol": "NIFTY BANK",
      "ltp": 53200.00,
      "change": -150.00,
      "changePct": -0.28,
      ...
    }
  ],
  "meta": { "cached": true, "stale": false, "asOf": "...", "marketPhase": "open" }
}
```

---

### `GET /api/market/indices/:index`
Single index quote.

**Auth:** Bearer token

**Path params:** `index` — e.g. `NIFTY%2050`

**Response `200`:** Single index object (same shape as above)

**Response `404`:** Index not tracked

---

### `GET /api/market/quotes`
All watched equity symbols (from `NSE_WATCH_SYMBOLS` env).

**Auth:** Bearer token

**Response `200`:**
```json
{
  "data": [
    {
      "symbol": "RELIANCE",
      "companyName": "Reliance Industries Ltd.",
      "ltp": 2985.50,
      "open": 2950.00,
      "high": 3010.00,
      "low": 2940.00,
      "prevClose": 2970.00,
      "change": 15.50,
      "changePct": 0.52,
      "volume": 4523000,
      "totalTradedValue": 13501927500
    }
  ],
  "meta": { "cached": true, "stale": false, "asOf": "...", "marketPhase": "open" }
}
```

---

### `GET /api/market/quotes/:symbol`
Single equity quote.

**Auth:** Bearer token

**Path params:** `symbol` — e.g. `RELIANCE`

**Response `200`:** Single equity object (same shape as above)

**Response `404`:** Symbol not in watched list

---

### `GET /api/market/options/:symbol`
Options chain for a symbol.

**Auth:** Bearer token

**Path params:** `symbol` — e.g. `NIFTY`

**Response `200`:**
```json
{
  "data": {
    "symbol": "NIFTY",
    "expiryDates": ["2026-08-28", "2026-09-25"],
    "underlyingValue": 24850.35,
    "records": [
      {
        "strikePrice": 24800,
        "expiryDate": "2026-08-28",
        "CE": {
          "ltp": 95.50,
          "openInterest": 285000,
          "changePct": 12.5,
          "impliedVolatility": 14.2
        },
        "PE": {
          "ltp": 45.00,
          "openInterest": 310000,
          "changePct": -8.2,
          "impliedVolatility": 13.8
        }
      }
    ]
  },
  "meta": { "cached": true, "stale": false, "asOf": "...", "marketPhase": "open" }
}
```

---

### `GET /api/market/movers`
Top gainers or losers.

**Auth:** Bearer token

**Query params:**
| Param | Type | Required | Values |
|-------|------|----------|--------|
| `type` | string | Yes | `gainers` \| `losers` |

**Response `200`:**
```json
{
  "data": [
    {
      "symbol": "TITAN",
      "ltp": 3850.00,
      "change": 192.50,
      "changePct": 5.26,
      "volume": 1250000
    }
  ],
  "meta": { "cached": true, "stale": false, "asOf": "...", "marketPhase": "open" }
}
```

---

## Watchlist

The API now supports multiple named watchlists per user.

### `GET /api/watchlist`
List all watchlists for the authenticated user with live LTP for each symbol.

**Auth:** Bearer token

**Response `200`:**
```json
[ {
  "id": "wl_01J5K...",
  "name": "My Watchlist",
  "items": [
    {
      "id": "wli_01J5K...",
      "symbol": "RELIANCE",
      "notes": "Long-term hold",
      "addedAt": "2026-08-01T00:00:00.000Z",
      "ltp": 2985.50,
      "changePct": 0.52
    }
  ]
} ]
```

---

### `GET /api/watchlist/:id`
Get a single watchlist by id with live prices.

**Auth:** Bearer token

**Response `200`:** same shape as single element above

**Response `404`:** Watchlist not found

---

### `POST /api/watchlist`
Create a new watchlist.

**Auth:** Bearer token

**Request:**
```json
{ "name": "Tech Stocks" }
```

**Response `201`:** Newly created watchlist object

**Response `409`:** Duplicate watchlist name for the same user

---

### `PATCH /api/watchlist/:id`
Rename an existing watchlist.

**Auth:** Bearer token

**Request:**
```json
{ "name": "My New Name" }
```

**Response `200`:** Updated watchlist

**Response `404` / `409`** as appropriate

---

### `DELETE /api/watchlist/:id`
Delete an entire watchlist (and its items).

**Auth:** Bearer token

**Response `204`:** No Content

**Response `404`:** Watchlist not found

---

### `POST /api/watchlist/:id/items`
Add a symbol to the specified watchlist.

**Auth:** Bearer token

**Request:**
```json
{ "symbol": "TCS", "notes": "IT sector" }
```

**Response `201`:** Created watchlist item

**Response `409`:** Symbol already in watchlist

---

### `DELETE /api/watchlist/:id/items/:symbol`
Remove a symbol from the specified watchlist.

**Auth:** Bearer token

**Response `204`:** No Content

**Response `404`:** Item or watchlist not found

---

## Portfolio

### `GET /api/portfolio`
Get user's default portfolio with P&L computed from live Redis prices.

**Auth:** Bearer token

**Response `200`:**
```json
{
  "data": {
    "id": "pf_01J5K...",
    "name": "My Portfolio",
    "summary": {
      "totalInvested": 985000.00,
      "currentValue": 1043250.00,
      "totalPnl": 58250.00,
      "totalPnlPct": 5.91
    },
    "holdings": [
      {
        "id": "hld_01J5K...",
        "symbol": "RELIANCE",
        "quantity": 100,
        "avgBuyPrice": 2800.00,
        "buyDate": "2026-03-15",
        "ltp": 2985.50,
        "currentValue": 298550.00,
        "pnl": 18550.00,
        "pnlPct": 6.63
      }
    ]
  }
}
```

---

### `POST /api/portfolio/holdings`
Add a holding to the portfolio.

**Auth:** Bearer token

**Request:**
```json
{
  "symbol": "HDFCBANK",
  "quantity": 50,
  "avgBuyPrice": 1650.00,
  "buyDate": "2026-07-10",
  "notes": "Banking sector"
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "hld_02K6L...",
    "symbol": "HDFCBANK",
    "quantity": 50,
    "avgBuyPrice": 1650.00,
    "buyDate": "2026-07-10"
  }
}
```

---

### `PATCH /api/portfolio/holdings/:id`
Update a holding.

**Auth:** Bearer token

**Request:** (all fields optional)
```json
{
  "quantity": 75,
  "avgBuyPrice": 1660.00,
  "notes": "Added more"
}
```

**Response `200`:** Updated holding

---

### `DELETE /api/portfolio/holdings/:id`
Remove a holding.

**Auth:** Bearer token

**Response `200`:**
```json
{ "data": { "success": true } }
```

---

## Screener

### `GET /api/screener/results`
Filter NSE stocks from the latest market snapshot.

**Auth:** Bearer token

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `change_gt` | number | Change% greater than |
| `change_lt` | number | Change% less than |
| `volume_gt` | number | Volume greater than |
| `volume_lt` | number | Volume less than |
| `sector` | string | Sector/index name |
| `week52_high_pct_lt` | number | % below 52-week high (e.g. `5` = within 5% of high) |
| `week52_low_pct_gt` | number | % above 52-week low |
| `sort_by` | string | `change_pct`, `volume`, `ltp`, `market_cap` |
| `sort_dir` | string | `asc` \| `desc` (default `desc`) |
| `limit` | number | Max results (default 50, max 200) |
| `offset` | number | Pagination offset |

**Example:** `GET /api/screener/results?change_gt=3&volume_gt=1000000&sort_by=change_pct`

**Response `200`:**
```json
{
  "data": {
    "total": 23,
    "results": [
      {
        "symbol": "BAJFINANCE",
        "companyName": "Bajaj Finance Ltd.",
        "sector": "NIFTY FINANCIAL SERVICES",
        "ltp": 7250.00,
        "changePct": 4.82,
        "volume": 1850000,
        "week52High": 7480.00,
        "week52Low": 5800.00
      }
    ],
    "snappedAt": "2026-08-18T15:45:00.000Z"
  }
}
```

---

### `GET /api/screener/presets`
List saved screener presets for the organization.

**Auth:** Bearer token

**Response `200`:**
```json
{
  "data": [
    {
      "id": "sp_01J5K...",
      "name": "Strong Gainers",
      "filters": {
        "change_gt": 3,
        "volume_gt": 1000000,
        "sort_by": "change_pct",
        "sort_dir": "desc"
      },
      "createdAt": "2026-08-10T00:00:00.000Z"
    }
  ]
}
```

---

### `POST /api/screener/presets`
Save a screener preset.

**Auth:** Bearer token

**Request:**
```json
{
  "name": "Strong Gainers",
  "filters": {
    "change_gt": 3,
    "volume_gt": 1000000,
    "sort_by": "change_pct",
    "sort_dir": "desc"
  }
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "sp_01J5K...",
    "name": "Strong Gainers",
    "filters": { ... },
    "createdAt": "2026-08-19T10:00:00.000Z"
  }
}
```

---

### `DELETE /api/screener/presets/:id`
Delete a saved preset.

**Auth:** Bearer token

**Response `200`:**
```json
{ "data": { "success": true } }
```

---

## Health

### `GET /api/health`
System health check. No auth required.

**Response `200`:**
```json
{
  "data": {
    "status": "ok",
    "timestamp": "2026-08-19T09:30:00.000Z",
    "services": {
      "database": "ok",
      "redis": "ok"
    }
  }
}
```

**Response `503`:** One or more services unavailable

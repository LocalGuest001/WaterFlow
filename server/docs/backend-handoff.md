# WaterFlow Backend Current State

## Purpose

This document describes the backend as it exists today so the service can be migrated to FastAPI without guessing at behavior.

The live backend is a Fastify API using PostgreSQL, migrations in `server/migrations/`, and a thin controller/service split. There is no auth layer yet, and the app is still operating as a single-user internal tool.

## What The Backend Does

The backend owns the `Delivery` domain object. Every user-facing screen is based on delivery records and server-derived state:

- `Dashboard` reads list and summary data.
- `NewEntry` creates a delivery.
- `ActiveRecords` shows open deliveries and triggers return actions.
- `History` shows completed deliveries and supports search.

Delivery state is derived on the server, not entered manually:

- `completed` means no coolers or bottles are pending.
- `overdue` means items are still pending and the record is at least 48 hours old.
- `active` means items are pending and the record is not overdue.

## Request Flow

1. The frontend calls `src/services/api.js`.
2. The API client sends requests to `http://localhost:4000/api/v1` by default.
3. Fastify routes in `server/src/routes/router.js` dispatch to controller handlers.
4. Controllers in `server/src/controllers/deliveryController.js` are thin wrappers around the service layer.
5. `server/src/services/deliveryService.js` validates input, applies business rules, and reads or writes PostgreSQL.
6. `server/src/domain/delivery.js` normalizes records and computes pending counts and status fields.
7. Responses are returned in a shared envelope with `success`, `message`, `data`, and optional `pagination`.

## Server Structure

```text
server/
  src/
    app.js
    index.js
    config/env.js
    controllers/deliveryController.js
    db/
      migrate.js
      pool.js
      seed.js
    domain/delivery.js
    routes/router.js
    services/deliveryService.js
    utils/apiError.js
  migrations/
    001_initial_schema.sql
  docs/
    backend-handoff.md
```

## Runtime And Startup

`server/src/index.js` is the entry point.

Startup sequence:

1. Load environment variables through `dotenv`.
2. Run migrations and seed data only when `NODE_ENV=development` or `RUN_MIGRATIONS=true`.
3. Build the Fastify app.
4. Register graceful shutdown handlers for `SIGINT` and `SIGTERM`.
5. Start listening on `HOST` and `PORT`.

The server uses these packages and behaviors:

- `fastify` as the HTTP server.
- `@fastify/helmet` for security headers.
- `@fastify/cors` with a configurable allowlist.
- `@fastify/rate-limit` at 120 requests per minute.
- `pg` with a shared pool stored on `globalThis`.

## Environment Variables

Required:

- `DATABASE_URL`

Optional:

- `NODE_ENV` defaults to `development`.
- `PORT` defaults to `4000`.
- `HOST` defaults to `0.0.0.0`.
- `API_PREFIX` defaults to `/api/v1`.
- `CORS_ORIGIN` defaults to `http://localhost:5173`.
- `SEED_DEMO_DATA` defaults to `true`.

## API Contract

Base URL: `http://localhost:4000/api/v1`

Health check: `GET /health`.

Delivery endpoints:

- `GET /deliveries`
- `GET /deliveries/summary`
- `GET /deliveries/:id`
- `POST /deliveries`
- `PATCH /deliveries/:id`
- `DELETE /deliveries/:id`
- `POST /deliveries/:id/return-cooler`
- `POST /deliveries/:id/return-bottle`
- `POST /deliveries/:id/return-all`

List query parameters:

- `q`
- `status`
- `page`
- `limit`
- `sortBy`
- `sortOrder`

Supported `status` values are `all`, `active`, `overdue`, and `completed`.

Successful responses use this shape:

```json
{
  "success": true,
  "message": "Delivery fetched successfully.",
  "data": {},
  "pagination": {}
}
```

Error responses use this shape:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {}
}
```

## Delivery Data Model

The database table is `deliveries`.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, generated with `gen_random_uuid()` |
| `customer_name` | `text` | Required |
| `phone_number` | `text` | Required, validated as 10 digits |
| `notes` | `text` | Defaults to empty string |
| `coolers_issued` | `integer` | Non-negative |
| `coolers_returned` | `integer` | Non-negative |
| `bottles_issued` | `integer` | Non-negative |
| `bottles_returned` | `integer` | Non-negative |
| `created_at` | `timestamptz` | Defaults to `now()` |
| `updated_at` | `timestamptz` | Defaults to `now()` |
| `completed_at` | `timestamptz` | Set when everything is returned |
| `last_action_at` | `timestamptz` | Used for ordering feeds |
| `deleted_at` | `timestamptz` | Soft delete marker |

Database constraints and indexes:

- Returned counts cannot exceed issued counts.
- Indexes exist on `deleted_at`, `phone_number`, `customer_name`, `created_at`, `updated_at`, `last_action_at`, and `completed_at`.

## Business Rules

These rules live in the backend service and domain layers:

- `customerName` is required on create, and on update if the field is present.
- `phoneNumber` must be exactly 10 digits.
- Issued and returned counts must be non-negative numbers.
- A delivery is completed when both cooler and bottle pending counts are zero.
- A delivery becomes overdue when it still has pending items and the created time is 48 hours or older.
- Soft delete sets `deleted_at` instead of removing the row.
- Return actions are idempotent when nothing is pending; the current record is returned unchanged.

The service layer also clamps counts to safe numeric values before normalization.

## Response Shape

Controllers do not return raw database rows. The normalization layer converts records into frontend-friendly fields:

- `customerName`
- `phoneNumber`
- `coolersIssued`
- `coolersReturned`
- `bottlesIssued`
- `bottlesReturned`
- `coolersPending`
- `bottlesPending`
- `pendingTotal`
- `status`
- `isOverdue`
- `createdAt`
- `updatedAt`
- `completedAt`
- `lastActionAt`
- `deletedAt`

The backend also includes compatibility aliases in the normalized delivery shape for the existing frontend store:

- `coolerTaken`
- `coolerReturned`
- `bottleTaken`
- `bottleReturned`
- `overdue`

## Summary Endpoint

`GET /deliveries/summary` returns dashboard counts computed from PostgreSQL:

- `totalDeliveries`
- `activeDeliveries`
- `overdueDeliveries`
- `completedDeliveries`
- `pendingCoolers`
- `pendingBottles`

## Validation And Errors

Validation failures throw `ApiError` with a status code and optional details. The Fastify error handler translates that into JSON and keeps non-API errors from leaking implementation details.

Notable cases:

- Invalid delivery ids return `400`.
- Missing rows return `404`.
- Unhandled server errors return `500` with a generic message.

## Database Lifecycle

`server/src/db/migrate.js` applies `*.sql` files from `server/migrations/` in lexical order and records applied files in `schema_migrations`.

The current migration file is `server/migrations/001_initial_schema.sql`.

`server/src/db/seed.js` inserts demo deliveries only when `SEED_DEMO_DATA` is enabled and the table does not already contain active records.

## Frontend Integration

The frontend API client is in `src/services/api.js`.

It currently expects:

- JSON responses with the `success` / `message` / `data` wrapper.
- A health check at `/health`.
- The API prefix to be `/api/v1` unless overridden.
- Delivery records that already include derived status and pending fields.

The Zustand store still keeps some normalization logic on the client, mainly for compatibility with existing UI state and record ordering.

## Local Commands

From the repo root:

```powershell
npm run server:dev
npm run server:start
npm run server:migrate
npm run server:seed
```

Backend-only commands are also available under `server/package.json`:

```powershell
npm --prefix server run dev
npm --prefix server run start
npm --prefix server run db:migrate
npm --prefix server run db:seed
```

## FastAPI Migration Notes

This is the behavior to preserve during migration:

- Keep the delivery status rules and the 48-hour overdue threshold.
- Keep the soft-delete model.
- Keep the summary endpoint contract.
- Keep the frontend-facing field names or provide a deliberate compatibility layer.
- Keep the current list filters, pagination, and sort behavior.

The safest migration path is to match the current HTTP contract first, then simplify the frontend once the new API is stable.


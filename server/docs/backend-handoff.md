# WaterTrack Backend Handoff

## System Analysis

The frontend is a Vite React PWA using React Router and Zustand. Routing is flat: `/dashboard`, `/new-entry`, `/active-records`, and `/history`. There is no current login, signup, protected route, role-based UI, file upload, modal workflow, or external service layer.

The core entity is `Delivery`. It drives every page:

- `Dashboard` reads all deliveries, derives active/completed groups, summary cards, overdue counts, and recent activity.
- `NewEntry` creates a delivery with `customerName`, `phoneNumber`, `coolerCount`, `bottleCount`, and `notes`.
- `ActiveRecords` lists `active` and `overdue` deliveries and calls return actions.
- `History` lists `completed` deliveries and filters by customer name or phone number.

Status is derived, not user-entered:

- `completed`: no pending coolers or bottles.
- `overdue`: pending items exist and the delivery was created at least 48 hours ago.
- `active`: pending items exist and the record is not overdue.

## Data Flow

1. User submits a delivery or taps a return action.
2. Page calls the existing Zustand action (`addEntry`, `returnCooler`, `returnBottle`, `returnAll`, `updateDelivery`, `deleteDelivery`).
3. Store validates the same frontend rules and calls `src/services/api.js`.
4. Backend route dispatches to controller.
5. Controller reads JSON/query/path params and calls the delivery service.
6. Service validates, writes SQLite, recalculates derived status/pending fields, and returns frontend-shaped data.
7. Controller returns `{ success, message, data, pagination }`.
8. Store normalizes records and updates UI state.

## Backend Structure

```text
server/
  config/env.js
  controllers/deliveryController.js
  db/connection.js
  db/migrate.js
  db/seed.js
  docs/backend-handoff.md
  index.js
  middleware/cors.js
  middleware/notFound.js
  routes/router.js
  services/deliveryService.js
  utils/http.js
  utils/logger.js
```

The backend uses Node's built-in HTTP server and Node 22 SQLite. It keeps MVC-style separation without adding new package dependencies.

## Database Schema

`deliveries`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | TEXT PK | UUID |
| `customer_name` | TEXT | Required |
| `phone_number` | TEXT | Required, 10 digits |
| `notes` | TEXT | Empty string by default |
| `coolers_issued` | INTEGER | Non-negative |
| `coolers_returned` | INTEGER | Non-negative |
| `bottles_issued` | INTEGER | Non-negative |
| `bottles_returned` | INTEGER | Non-negative |
| `created_at` | TEXT | ISO timestamp |
| `updated_at` | TEXT | ISO timestamp |
| `completed_at` | TEXT nullable | Set when all items are returned |
| `last_action_at` | TEXT | Sort key for app feeds |
| `deleted_at` | TEXT nullable | Soft delete |

Indexes:

- `(deleted_at, last_action_at DESC)` for active list reads.
- `customer_name` and `phone_number` for search.
- `completed_at DESC` for history.

ER view:

```text
Delivery
  id
  customer details
  issued counts
  returned counts
  lifecycle timestamps
```

Authentication is intentionally not implemented because the frontend has no auth flow. Add users/roles later before exposing this outside a trusted internal network.

## API Contract

Base URL: `http://localhost:4000/api/v1`

All responses use:

```json
{
  "success": true,
  "message": "Data fetched successfully",
  "data": {},
  "pagination": {}
}
```

Errors use:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {}
}
```

### Health

`GET /health`

Returns service status.

### List Deliveries

`GET /deliveries?q=&status=&page=1&limit=50&sortBy=lastActionAt&sortOrder=desc`

`status` may be `all`, `open`, `active`, `overdue`, or `completed`.

### Create Delivery

`POST /deliveries`

```json
{
  "customerName": "Ahmed",
  "phoneNumber": "9876543210",
  "coolerCount": 2,
  "bottleCount": 4,
  "notes": "Morning drop"
}
```

Validation:

- `customerName` required.
- `phoneNumber` must be exactly 10 digits.
- Counts must be non-negative numbers.

### Read Delivery

`GET /deliveries/:id`

### Update Delivery

`PATCH /deliveries/:id`

Accepts partial delivery fields:

```json
{
  "customerName": "Ahmed",
  "phoneNumber": "9876543210",
  "notes": "Updated note",
  "coolersIssued": 2,
  "coolersReturned": 1,
  "bottlesIssued": 4,
  "bottlesReturned": 2
}
```

### Delete Delivery

`DELETE /deliveries/:id`

Soft deletes the record.

### Return Actions

`POST /deliveries/:id/return-cooler`

Returns one pending cooler.

`POST /deliveries/:id/return-bottle`

Returns one pending bottle.

`POST /deliveries/:id/return-all`

Marks every issued item as returned.

### Summary

`GET /deliveries/summary`

Returns dashboard-friendly totals: pending coolers, pending bottles, active customers, overdue customers, completed deliveries, and total deliveries.

## Migration Strategy

`server/db/migrate.js` creates the current schema idempotently at startup. For future schema changes, add a `schema_migrations` table and versioned migration files before making destructive changes.

## Running

```bash
npm run server
npm run dev
```

Optional environment:

```bash
PORT=4000
API_PREFIX=/api/v1
DATABASE_PATH=server/data/watertrack.sqlite
SEED_DEMO_DATA=false
VITE_API_URL=http://localhost:4000/api/v1
```


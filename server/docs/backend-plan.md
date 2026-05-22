# WaterFlow Backend Plan

## Goal
Build a production-shaped backend for the WaterFlow app that runs locally in development with PostgreSQL, supports the current delivery workflow, and avoids patch-style integration work.

## Scope for v1
- Single user only.
- No authentication or authorization.
- Local development environment only.
- PostgreSQL as the database.
- Clean API contract with room for future multi-user expansion.
- Frontend flow may be adjusted where it improves the data model or removes awkward client-side logic.

## Non-goals for v1
- CI/CD pipelines.
- Deployment automation.
- Public multi-tenant access.
- Role-based permissions.
- File uploads.
- Complex workflow engines.

## Product Rules
- A delivery is the core domain object.
- Status must be derived from business rules, not manually entered.
- Pending item counts must be calculated server-side.
- Return actions must be idempotent where possible.
- Soft delete should be used instead of hard delete.
- History must remain queryable after a record is closed.

## Proposed Backend Shape
- Node.js API server.
- PostgreSQL database.
- Migration-based schema management.
- Service layer for business logic.
- Controller layer for request/response handling.
- Validation layer for input safety.
- Central error handling.
- Structured console logging for local development.

## Data Model
### Delivery
Primary record for a customer delivery event.

Suggested fields:
- `id`
- `customer_name`
- `phone_number`
- `notes`
- `coolers_issued`
- `coolers_returned`
- `bottles_issued`
- `bottles_returned`
- `status`
- `created_at`
- `updated_at`
- `completed_at`
- `last_action_at`
- `deleted_at`

### Derived values
These should be calculated from source fields and business rules:
- `pending_coolers`
- `pending_bottles`
- `pending_total`
- `is_overdue`
- `is_completed`

## API Surface
The API should cover the current UI needs without exposing client-side business logic.

### Health
- `GET /health`

### Deliveries
- `GET /deliveries`
- `GET /deliveries/:id`
- `POST /deliveries`
- `PATCH /deliveries/:id`
- `DELETE /deliveries/:id`

### Return actions
- `POST /deliveries/:id/return-cooler`
- `POST /deliveries/:id/return-bottle`
- `POST /deliveries/:id/return-all`

### Summary
- `GET /deliveries/summary`

## Development Architecture
### Configuration
- Environment variables in `.env`.
- Separate values for app port, API prefix, database URL, and seed mode.
- Fail fast if required configuration is missing.

### Database
- PostgreSQL schema created through migrations.
- Local seed data available for repeatable development.
- Indexes for list, search, and history queries.

### Services
- Keep business rules in services, not controllers.
- Normalize records in one place.
- Recalculate status consistently after every mutation.

### Controllers
- Thin request/response layer.
- Validate inputs and translate service errors to HTTP responses.

### Frontend integration
- Add a dedicated API client.
- Replace direct store-only data mutation with API calls.
- Keep UI behavior stable while moving the source of truth to the backend.

## Implementation Phases
### Phase 1: Contract and schema
- Finalize request and response shapes.
- Define the delivery lifecycle rules.
- Create the PostgreSQL schema and migrations.
- Define seed data for local use.

### Phase 2: Backend foundation
- Create the server entry point.
- Add config loading.
- Add logging and error handling.
- Add validation helpers.
- Add database connection and health check.

### Phase 3: Delivery business logic
- Implement create, read, update, delete.
- Implement return actions.
- Implement summary endpoint.
- Implement search, pagination, and filtering.
- Ensure status derivation stays consistent.

### Phase 4: Frontend wiring
- Add an API service layer.
- Move data loading and mutations to the backend.
- Adjust page flows only where needed to keep the UX clean.
- Remove duplicated client-side business logic after backend parity is confirmed.

### Phase 5: Local verification
- Smoke test the full flow in dev.
- Verify seed/reset behavior.
- Verify empty states, overdue states, completed states, and return actions.
- Validate edge cases for bad input and duplicate actions.

## Quality Bar
The backend should be considered ready only if:
- Core flows work from the UI through the API to PostgreSQL.
- Status and pending counts are correct in all tested cases.
- Invalid input returns clear validation errors.
- The frontend no longer depends on fragile patch-style logic.
- The code is structured so auth can be added later without rewriting the domain layer.

## Next Build Order
1. Finalize the exact delivery lifecycle rules and API response shape.
2. Create the database schema and migrations.
3. Build the server foundation and delivery service.
4. Add the frontend API client.
5. Connect the pages and verify the flows locally.

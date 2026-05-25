# WaterFlow

WaterFlow is a local delivery tracking app with a React frontend, a PostgreSQL database, and a backend API.

Note: the original Node/Fastify backend in `server/` is deprecated. A new Python/FastAPI backend lives in `api/` and is the supported server for current development. See `server/DEPRECATED.md` for migration notes.

The frontend talks to the backend through `/api/v1`, so an API service needs to be running for the app to work correctly.

## Requirements

- Node.js 20 or newer
- npm
- PostgreSQL 15 or newer

## Project Layout

- `src/` - React frontend
- `server/` - Fastify API and database scripts
- `server/migrations/` - database schema
- `server/.env.example` - sample backend environment file

## First Setup

1. Install dependencies for the frontend and backend:

```powershell
npm install
npm --prefix server install
```

2. Create `server/.env` from the example file and update the database connection:

```powershell
Copy-Item server/.env.example server/.env
```

Update `server/.env` so `DATABASE_URL` points to your PostgreSQL database. Example:

```env
NODE_ENV=development
PORT=4000
API_PREFIX=/api/v1
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/waterflow
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
SEED_DEMO_DATA=false
```

## Run the App

Open two terminals and start both services:

### 1. Start the backend (FastAPI - recommended)

Start the Python FastAPI backend (recommended):

```powershell
# from the repo root (recommended)
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

The FastAPI app listens on `http://localhost:8000` by default. The frontend expects the API at `/api/v1` — set `VITE_API_URL` in a `.env` file or `.env.local` (see `src/services/api.js`).

If you still need the old Node backend for reference, see `server/DEPRECATED.md` — it is no longer the recommended runtime and running `npm run server:dev` will print a deprecation notice.

### 2. Start the frontend

```powershell
npm run dev
```

Vite may choose `http://localhost:5173` or `http://localhost:5174` if one port is busy.

## What You Should See

- Frontend app at the Vite URL shown in the terminal
- Backend health check at `http://localhost:4000/health`
- API data at `http://localhost:4000/api/v1/deliveries`

## Useful Commands

Run database migration:

If you're using the original Node migrations, they remain in `server/migrations/`. The Python service does not currently run those migrations automatically; apply them to your Postgres instance using the provided SQL or your own migration tooling. Example (from repo root):

```powershell
# run Node-style migration script (legacy)
npm run server:migrate

# Or apply SQL directly, e.g. using psql:
# psql "$DATABASE_URL" -f server/migrations/001_initial_schema.sql
```

Seed demo data:

```powershell
npm run server:seed
```

Build the frontend:

```powershell
npm run build
```

Run lint checks:

```powershell
npm run lint
```

## Notes

- The frontend reads from the backend API, so the app will not work correctly if the backend is stopped.
- If the frontend shows nothing, check that the backend is running and that `DATABASE_URL` is valid.
- If you use a different frontend port, update `CORS_ORIGIN` in `server/.env` to match it.

## API Overview

- `GET /health`
- `GET /api/v1/deliveries`
- `GET /api/v1/deliveries/:id`
- `POST /api/v1/deliveries`
- `PATCH /api/v1/deliveries/:id`
- `DELETE /api/v1/deliveries/:id`
- `POST /api/v1/deliveries/:id/return-cooler`
- `POST /api/v1/deliveries/:id/return-bottle`
- `POST /api/v1/deliveries/:id/return-all`
- `GET /api/v1/deliveries/summary`

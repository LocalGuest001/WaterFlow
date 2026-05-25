# WaterFlow FastAPI Scaffold

This folder starts the Python migration for the WaterFlow backend.

## Status

- `GET /health` is available.
- Delivery endpoints exist as stubs and currently return a clear `501` until the PostgreSQL persistence layer is wired.

## Run

```powershell
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

## Environment

Copy `.env.example` to `.env` and set `DATABASE_URL` to the same PostgreSQL database used by the current backend.

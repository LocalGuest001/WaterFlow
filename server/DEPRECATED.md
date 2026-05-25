# Deprecated: Node/Fastify backend

The `server/` folder contains the original Node/Fastify backend implementation. This backend is now deprecated in favor of a new Python/FastAPI service located in the `api/` folder.

Why deprecated
- The project migrated to a FastAPI-backed service to align with maintenance and deployment plans.
- The `api/` service has feature parity for core read endpoints and is the actively maintained backend.

What changed
- Primary development and runtime target: `api/` (Python + FastAPI)
- The Node `server/` remains in the repository for reference and existing migration SQL, but its default npm scripts now emit a deprecation notice.

How to run the supported backend (recommended)

From the repository root, using the project's Python environment:

```powershell
D:\Projects\WaterFlow\.venv\Scripts\Activate.ps1
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend configuration
- The frontend reads `VITE_API_URL` (see `src/services/api.js`). Create a `.env.local` with `VITE_API_URL=http://localhost:8000`.

Legacy Node server
- The legacy server scripts are intentionally left in place but will print a deprecation notice by default. If you need to run the legacy server, use the `legacy:dev` script inside `server/package.json`.

Migrations and data
- Migration SQL lives in `server/migrations/` and can be applied directly to your Postgres instance.

Questions or help
- If you want me to fully remove the `server/` folder or to wire migrations into the Python app, tell me and I'll prepare a plan and changes.

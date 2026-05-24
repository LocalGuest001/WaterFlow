# Vercel Deployment Guide

This guide splits WaterFlow into a frontend-only Vercel deployment with a separate backend.

## Frontend (Vercel)

### Setup

1. Push the latest code to GitHub
2. Import your repository into Vercel
3. Configure the environment variable:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://your-backend-host.com/api/v1` (replace with your real backend URL)
4. Leave all other settings at defaults
5. Deploy

### Build Settings

- **Build Command:** `npm run build` (auto-detected)
- **Output Directory:** `dist` (configured in `vercel.json`)
- **Install Command:** `npm install` (auto-detected)

## Backend

Deploy the backend separately using one of these options:

### Option 1: Self-Hosted (Recommended for Production)

1. Deploy `server/` to your own server (Linux VPS, Docker, etc.)
2. Set `DATABASE_URL` to a PostgreSQL database
3. Run `npm install && npm start` in the `server/` directory
4. Backend will listen on the configured `PORT` (default `4000`)
5. Update `VITE_API_URL` on Vercel to point to your backend

### Option 2: Render or Railway (Easy & Free Tier Available)

**Render:**
1. Connect your GitHub repo to Render
2. Create a new Web Service from the repo
3. Set **Build Command:** `npm --prefix server install`
4. Set **Start Command:** `npm --prefix server start`
5. Add environment variables:
   - `DATABASE_URL`: PostgreSQL connection string
   - `NODE_ENV`: `production`
   - `PORT`: `3000` or auto-assigned port
6. Deploy
7. Copy the deployed URL and set `VITE_API_URL` on Vercel to `https://<render-url>/api/v1`

**Railway:**
1. Create a new project and connect your GitHub repo
2. Add a PostgreSQL database service
3. Set `DATABASE_URL` to the connected database
4. Configure the Node.js service with start command: `npm --prefix server start`
5. Deploy
6. Copy the public URL and update `VITE_API_URL` on Vercel

### Option 3: Docker

```bash
# In server/ directory
docker build -t waterflow-backend .
docker run -e DATABASE_URL=<postgres-url> -p 4000:4000 waterflow-backend
```

Then update `VITE_API_URL` on Vercel.

## Environment Variables

### Vercel (Frontend)

| Variable | Value | Example |
|----------|-------|---------|
| `VITE_API_URL` | Backend API base URL | `https://api.example.com/api/v1` |

### Backend Server

| Variable | Value | Example |
|----------|-------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host:5432/db` |
| `NODE_ENV` | Deployment environment | `production` |
| `PORT` | Server port | `3000` or `4000` |
| `API_PREFIX` | API route prefix | `/api/v1` |
| `CORS_ORIGIN` | Frontend URL | `https://water-flow-ma8k.vercel.app` |
| `SEED_DEMO_DATA` | Auto-seed on startup | `false` (for production) |

## Verify Deployment

1. Visit `https://your-vercel-domain.vercel.app/`
2. App should load and show empty state or seeded data
3. Open DevTools → Network tab
4. Navigate to Dashboard or create a delivery
5. Check that API calls go to your backend URL
6. All requests should complete without 504 errors

## Troubleshooting

### 504 Errors

- **Cause:** Backend URL is unreachable or backend is down
- **Fix:** Check `VITE_API_URL` on Vercel matches your deployed backend
- **Fix:** Ensure backend server is running and accessible

### CORS Errors

- **Cause:** Backend `CORS_ORIGIN` doesn't match frontend URL
- **Fix:** Update backend `CORS_ORIGIN` environment variable to your Vercel domain

### Empty Data on Frontend

- **Cause:** Backend has no data or seeding failed
- **Fix:** Run `npm --prefix server run db:seed` on backend to populate demo data
- **Fix:** Or create deliveries manually through the app

## Local Development

For local testing with a real backend:

```bash
# Terminal 1: Backend
cd server
npm install
npm run server:dev

# Terminal 2: Frontend
npm install
npm run dev
```

Then visit `http://localhost:5173` and the frontend will call `http://localhost:4000/api/v1`.

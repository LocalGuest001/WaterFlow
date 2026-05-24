# Quick Deployment Checklist

## Pre-Deployment ✓

- [x] Frontend builds successfully (`npm run build`)
- [x] Backend starts with VERCEL=1 (`cd server && VERCEL=1 npm run start`)
- [x] API endpoints respond correctly with memory store
- [x] Request/response logging is active
- [x] All async operations complete without hanging

## Deployment Steps

### 1. Verify All Fixes Applied
```bash
# Check key files modified:
git diff HEAD~1 server/src/config/env.js  # Should show optional DATABASE_URL
git diff HEAD~1 server/src/db/pool.js     # Should show lazy pool init
git diff HEAD~1 server/src/index.js       # Should show Vercel skips
```

### 2. Test Locally
```bash
cd server
VERCEL=1 npm run start
# Look for: [server] Skipping migrations/seeding on Vercel

# In another terminal:
curl http://localhost:4000/api/v1/deliveries
# Should return 3 deliveries in <100ms
```

### 3. Push to Production
```bash
git add -A
git commit -m "fix: Vercel 504 timeouts - lazy pool init & memory store"
git push origin main
# Vercel will auto-deploy
```

### 4. Verify Deployment
- Open Vercel dashboard
- Check Function Logs for:
  ```
  [server] Initializing WaterFlow API
  [server] Environment: { ..., useMemoryStore: true }
  [server] Skipping migrations/seeding on Vercel
  ```
- Test: `curl https://your-domain.vercel.app/api/v1/deliveries`
- Expected: 200 response with 3 deliveries in <1 second

## Monitoring

### What to Watch For
- ✅ Response times <500ms (should be <10ms with memory store)
- ✅ No 504 errors
- ✅ Error rate <0.1%
- ✅ Function duration <1000ms

### If You See 504 Errors
1. Check Vercel Function Logs for actual error
2. Verify environment variables are set correctly
3. Check database connection if DATABASE_URL is set
4. Verify app can start: `VERCEL=1 npm run start`

### Key Log Messages to Expect
```
[server] Initializing WaterFlow API            ← Startup starting
[server] Environment: { ..., useMemoryStore: true }  ← Config loaded
[server] Skipping migrations/seeding on Vercel ← DB not running
[api] GET /api/v1/deliveries                   ← Request received
[deliveries] listDeliveries { useMemoryStore: true }  ← Handler called
[api] GET /api/v1/deliveries 200 5ms           ← Response sent
```

## Rollback (If Needed)
```bash
git revert HEAD
git push origin main
# Vercel will auto-redeploy previous version
```

## Files Modified

1. `server/src/config/env.js` - Made DATABASE_URL optional
2. `server/src/db/pool.js` - Lazy pool initialization
3. `server/src/db/migrate.js` - Skip on Vercel
4. `server/src/db/seed.js` - Skip on Vercel
5. `server/src/index.js` - Added conditional migrations
6. `server/src/app.js` - Added timeouts and logging
7. `server/src/services/deliveryService.js` - Added store logging

## Post-Deployment Tasks

- [ ] Monitor logs for 24 hours
- [ ] Verify response times are <500ms
- [ ] Test all endpoints work correctly
- [ ] Verify PWA install still works
- [ ] Confirm no 504 errors
- [ ] Check database connection (if DATABASE_URL is set)

## Success Criteria

✅ All requests return in <1 second
✅ No 504 errors in production
✅ Memory store provides demo data automatically
✅ API endpoints working correctly
✅ Frontend PWA functional
✅ Logs show request lifecycle clearly

---

**Status:** Ready to deploy! 🚀

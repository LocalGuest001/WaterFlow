import { pathToFileURL } from 'node:url'
import { env } from './config/env.js'
import { buildApp } from './app.js'
import { migrateDatabase } from './db/migrate.js'
import { seedDatabase } from './db/seed.js'
import { closePool } from './db/pool.js'

console.log('[server] MODULE START')

const isDirectRun = typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href

console.log('[server] Environment Detection', {
  isDirectRun,
  isVercel: env.isVercel,
  nodeEnv: env.nodeEnv,
})

console.log('[server] Building Fastify app...')
const app = buildApp()

console.log('[server] APP CREATED - Export ready for Vercel')
console.log('[server] App configured for:', env.isVercel ? 'Vercel Serverless' : 'Direct Server')

// Ensure app is ready for Vercel on module load
console.log('[server] Calling app.ready()...')
await app.ready()
console.log('[server] app ready')

// CRITICAL: Create a Vercel-compatible handler function
// Vercel expects: export default function(req, res)

let appRouter = null

// Initialize the app router on first request (lazy initialization for serverless)
async function initializeRouter() {
  if (!appRouter) {
    console.log('[server] Initializing router on first request')
    
    // Get Fastify's router which can handle raw requests
    // We use the internal routing method
    appRouter = app.routing.bind(app)
  }
  return appRouter
}

export default async function handler(req, res) {
  console.log('[server] handler invoked', { method: req.method, path: req.url })
  console.log('[server] request routed')
  
  try {
    // Initialize router if needed
    if (!appRouter) {
      await initializeRouter()
    }
    
    // Use Fastify's internal routing to handle the request
    // This passes the request directly to Fastify's router
    await app.routing(req, res)
  } catch (error) {
    console.error('[server] handler error:', error.message)
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
    }
    res.end(JSON.stringify({ success: false, message: 'Internal server error' }))
  }
}

async function main() {
  console.log('[server] Starting main server...')

  // Skip migrations and seeding on Vercel (serverless environment)
  if (!env.isVercel && env.databaseUrl) {
    console.log('[server] Running migrations and seeding...')
    try {
      await migrateDatabase()
      await seedDatabase()
      console.log('[server] Migrations and seeding completed')
    } catch (error) {
      console.error('[server] Migrations/seeding failed:', error.message)
      throw error
    }
  } else if (env.isVercel) {
    console.log('[server] Skipping migrations/seeding on Vercel (serverless environment)')
  } else {
    console.log('[server] Skipping migrations/seeding: DATABASE_URL not configured')
  }

  let shuttingDown = false

  const closeServer = async (signal) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log('[server] Shutting down server', { signal })
    await app.close()
    await closePool()
    process.exit(0)
  }

  process.once('SIGINT', closeServer)
  process.once('SIGTERM', closeServer)

  await app.listen({ host: env.host, port: env.port })
  console.log('[server] WaterFlow API started', { port: env.port, prefix: env.apiPrefix })
}

if (isDirectRun && !env.isVercel) {
  console.log('[server] Direct run detected (not on Vercel), starting server')
  main().catch(async (error) => {
    console.error('[server] Failed to start server:', error.message)
    console.error(error)
    await closePool().catch(() => {})
    process.exitCode = 1
  })
} else if (!isDirectRun && env.isVercel) {
  console.log('[server] Vercel serverless environment detected - skipping listen()')
  console.log('[server] READY FOR REQUESTS - Export complete')
} else if (!isDirectRun) {
  console.log('[server] Module imported as dependency (not direct run)')
  console.log('[server] READY FOR REQUESTS - Export complete')
}
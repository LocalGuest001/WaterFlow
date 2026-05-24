import { pathToFileURL } from 'node:url'
import { env } from './config/env.js'
import { buildApp } from './app.js'
import { migrateDatabase } from './db/migrate.js'
import { seedDatabase } from './db/seed.js'
import { closePool } from './db/pool.js'

const isDirectRun = typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href

console.log('[server] Initializing WaterFlow API')
console.log('[server] Environment:', {
  nodeEnv: env.nodeEnv,
  port: env.port,
  apiPrefix: env.apiPrefix,
  isVercel: env.isVercel,
  hasDatabaseUrl: !!env.databaseUrl,
  useMemoryStore: env.isVercel || env.forceMemoryStore,
})

const app = buildApp()

console.log('[server] Fastify app built successfully')

export default app.server

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
  console.log('[server] Running on Vercel serverless environment')
} else if (!isDirectRun) {
  console.log('[server] Module imported as dependency (not direct run)')
}
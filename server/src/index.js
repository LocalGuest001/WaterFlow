import { env } from './config/env.js'
import { buildApp } from './app.js'
import { migrateDatabase } from './db/migrate.js'
import { seedDatabase } from './db/seed.js'
import { closePool } from './db/pool.js'

async function main() {
  await migrateDatabase()
  await seedDatabase()

  const app = buildApp()
  let shuttingDown = false

  const closeServer = async (signal) => {
    if (shuttingDown) return
    shuttingDown = true
    app.log.info({ signal }, 'Shutting down server')
    await app.close()
    await closePool()
    process.exit(0)
  }

  process.once('SIGINT', closeServer)
  process.once('SIGTERM', closeServer)

  await app.listen({ host: env.host, port: env.port })
  app.log.info({ port: env.port, prefix: env.apiPrefix }, 'WaterFlow API started')
}

main().catch(async (error) => {
  console.error('Failed to start server.')
  console.error(error)
  await closePool().catch(() => {})
  process.exitCode = 1
})
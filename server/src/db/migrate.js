import { readFile } from 'node:fs/promises'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { pool, closePool } from './pool.js'
import { env } from '../config/env.js'

const moduleDir = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.resolve(moduleDir, '../../migrations')

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `)
}

export async function migrateDatabase() {
  // Skip if no database URL configured (using memory store)
  if (!env.databaseUrl) {
    console.log('[migrations] Skipping migrations: DATABASE_URL not configured')
    return { skipped: true, reason: 'DATABASE_URL not configured' }
  }

  console.log('[migrations] Starting database migrations...')
  const client = await pool.connect()

  try {
    await ensureMigrationsTable(client)

    const files = (await readdir(migrationsDir))
      .filter((file) => file.endsWith('.sql'))
      .sort((left, right) => left.localeCompare(right))

    console.log(`[migrations] Found ${files.length} migration files`)

    const appliedRows = await client.query('SELECT version FROM schema_migrations ORDER BY version ASC')
    const appliedVersions = new Set(appliedRows.rows.map((row) => row.version))

    for (const fileName of files) {
      if (appliedVersions.has(fileName)) {
        console.log(`[migrations] Skipping ${fileName} (already applied)`)
        continue
      }

      const filePath = path.join(migrationsDir, fileName)
      const migrationSql = await readFile(filePath, 'utf8')

      console.log(`[migrations] Applying ${fileName}...`)
      await client.query('BEGIN')
      try {
        await client.query(migrationSql)
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [fileName])
        await client.query('COMMIT')
        console.log(`[migrations] Applied ${fileName}`)
      } catch (error) {
        await client.query('ROLLBACK')
        console.error(`[migrations] Failed to apply ${fileName}:`, error.message)
        throw error
      }
    }

    console.log('[migrations] Migrations completed successfully')
    return { success: true }
  } finally {
    client.release()
  }
}

const isDirectRun = typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href

if (isDirectRun) {
  migrateDatabase()
    .then((result) => {
      console.log('[migrations] Migrations completed.', result)
    })
    .catch((error) => {
      console.error('[migrations] Migration failed.')
      console.error(error)
      process.exitCode = 1
    })
    .finally(async () => {
      await closePool()
    })
}
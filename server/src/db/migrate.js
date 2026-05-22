import { readFile } from 'node:fs/promises'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { pool, closePool } from './pool.js'

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
  const client = await pool.connect()

  try {
    await ensureMigrationsTable(client)

    const files = (await readdir(migrationsDir))
      .filter((file) => file.endsWith('.sql'))
      .sort((left, right) => left.localeCompare(right))

    const appliedRows = await client.query('SELECT version FROM schema_migrations ORDER BY version ASC')
    const appliedVersions = new Set(appliedRows.rows.map((row) => row.version))

    for (const fileName of files) {
      if (appliedVersions.has(fileName)) continue

      const filePath = path.join(migrationsDir, fileName)
      const migrationSql = await readFile(filePath, 'utf8')

      await client.query('BEGIN')
      try {
        await client.query(migrationSql)
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [fileName])
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
    }
  } finally {
    client.release()
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  migrateDatabase()
    .then(() => {
      console.log('Migrations completed.')
    })
    .catch((error) => {
      console.error('Migration failed.')
      console.error(error)
      process.exitCode = 1
    })
    .finally(async () => {
      await closePool()
    })
}
import { randomUUID } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { env } from '../config/env.js'
import { closePool, pool } from './pool.js'
import { migrateDatabase } from './migrate.js'

function buildSeedRows(now) {
  return [
    {
      id: randomUUID(),
      customer_name: 'Ahmed',
      phone_number: '9876543210',
      notes: 'Morning drop for the front shop',
      coolers_issued: 2,
      coolers_returned: 0,
      bottles_issued: 4,
      bottles_returned: 0,
      created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      updated_at: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      completed_at: null,
      last_action_at: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      deleted_at: null,
    },
    {
      id: randomUUID(),
      customer_name: 'Nadia',
      phone_number: '9123456780',
      notes: 'Completed evening route',
      coolers_issued: 1,
      coolers_returned: 1,
      bottles_issued: 2,
      bottles_returned: 2,
      created_at: new Date(now.getTime() - 26 * 60 * 60 * 1000),
      updated_at: new Date(now.getTime() - 25 * 60 * 60 * 1000),
      completed_at: new Date(now.getTime() - 25 * 60 * 60 * 1000),
      last_action_at: new Date(now.getTime() - 25 * 60 * 60 * 1000),
      deleted_at: null,
    },
    {
      id: randomUUID(),
      customer_name: 'Karim',
      phone_number: '9012345678',
      notes: 'Overdue return pending',
      coolers_issued: 1,
      coolers_returned: 0,
      bottles_issued: 1,
      bottles_returned: 0,
      created_at: new Date(now.getTime() - 72 * 60 * 60 * 1000),
      updated_at: new Date(now.getTime() - 72 * 60 * 60 * 1000),
      completed_at: null,
      last_action_at: new Date(now.getTime() - 72 * 60 * 60 * 1000),
      deleted_at: null,
    },
  ]
}

export async function seedDatabase() {
  // Skip if no database URL configured (using memory store)
  if (!env.databaseUrl) {
    console.log('[seed] Skipping seed: DATABASE_URL not configured')
    return { seeded: false, reason: 'DATABASE_URL not configured' }
  }

  if (!env.seedDemoData) {
    console.log('[seed] Skipping seed: SEED_DEMO_DATA disabled')
    return { seeded: false, reason: 'SEED_DEMO_DATA disabled' }
  }

  console.log('[seed] Starting seed process...')
  try {
    const existing = await pool.query('SELECT COUNT(*)::int AS count FROM deliveries WHERE deleted_at IS NULL')
    if ((existing.rows[0]?.count ?? 0) > 0) {
      console.log('[seed] Skipping seed: deliveries already exist')
      return { seeded: false, reason: 'deliveries already exist' }
    }

    const now = new Date()
    const rows = buildSeedRows(now)

    for (const row of rows) {
      await pool.query(
        `
          INSERT INTO deliveries (
            id, customer_name, phone_number, notes,
            coolers_issued, coolers_returned, bottles_issued, bottles_returned,
            created_at, updated_at, completed_at, last_action_at, deleted_at
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8,
            $9, $10, $11, $12, $13
          )
        `,
        [
          row.id,
          row.customer_name,
          row.phone_number,
          row.notes,
          row.coolers_issued,
          row.coolers_returned,
          row.bottles_issued,
          row.bottles_returned,
          row.created_at,
          row.updated_at,
          row.completed_at,
          row.last_action_at,
          row.deleted_at,
        ],
      )
    }

    console.log(`[seed] Seeded ${rows.length} deliveries successfully`)
    return { seeded: true, count: rows.length }
  } catch (error) {
    console.error('[seed] Seed failed:', error.message)
    throw error
  }
}

const isDirectRun = typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href

if (isDirectRun) {
  migrateDatabase()
    .then(() => seedDatabase())
    .then((result) => {
      console.log('[seed] Seed completed.', result)
    })
    .catch((error) => {
      console.error('[seed] Seed failed.')
      console.error(error)
      process.exitCode = 1
    })
    .finally(async () => {
      await closePool()
    })
}
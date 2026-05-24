import pg from 'pg'
import { env } from '../config/env.js'

const { Pool } = pg

// Reuse pool across lambda invocations or module reloads (serverless-friendly)
if (!globalThis.__waterflow_pool) {
  // Decide whether to enable SSL for hosted Postgres providers (e.g. Supabase)
  const useSsl = env.nodeEnv === 'production' || /supabase|render|vercel|elephantsql/i.test(String(env.databaseUrl))

  const poolOptions = {
    connectionString: env.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    // Only include ssl when required; many providers need rejectUnauthorized=false
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  }

  globalThis.__waterflow_pool = new Pool(poolOptions)
}

export const pool = globalThis.__waterflow_pool

export async function closePool() {
  try {
    await pool.end()
  } catch (e) {
    // ignore errors during shutdown
  }
}
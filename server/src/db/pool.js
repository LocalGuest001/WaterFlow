import pg from 'pg'
import { env } from '../config/env.js'

const { Pool } = pg

let poolInstance = null

function ensurePool() {
  if (poolInstance) return poolInstance

  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL is required to initialize database pool. Set VERCEL=1 or WATERFLOW_FORCE_MEMORY_STORE=true to use memory store instead.')
  }

  poolInstance = new Pool({
    connectionString: env.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  })

  poolInstance.on('error', (error) => {
    console.error('Unexpected error on idle client in pool:', error)
  })

  return poolInstance
}

export const pool = {
  async query(...args) {
    const p = ensurePool()
    try {
      return await p.query(...args)
    } catch (error) {
      console.error('Pool query error:', { error: error.message, code: error.code })
      throw error
    }
  },

  async connect() {
    const p = ensurePool()
    return p.connect()
  },

  async end() {
    if (poolInstance) {
      await poolInstance.end()
      poolInstance = null
    }
  },
}

export async function closePool() {
  await pool.end()
}
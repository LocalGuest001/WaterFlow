import 'dotenv/config'

function required(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function toInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: toInteger(process.env.PORT, 4000),
  host: process.env.HOST ?? '0.0.0.0',
  apiPrefix: process.env.API_PREFIX ?? '/api/v1',
  databaseUrl: required('DATABASE_URL'),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  seedDemoData: (process.env.SEED_DEMO_DATA ?? 'true').toLowerCase() !== 'false',
}
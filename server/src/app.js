import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { env } from './config/env.js'
import { ApiError, isApiError } from './utils/apiError.js'
import { registerRoutes } from './routes/router.js'
import { healthHandler } from './controllers/deliveryController.js'

export function buildApp() {
  console.log('[app] PLUGINS START - Initializing Fastify instance')
  
  const app = Fastify({
    logger: {
      level: env.nodeEnv === 'development' ? 'info' : 'warn',
    },
    requestTimeout: 30_000,
  })

  console.log('[app] Fastify instance created')

  const configuredOrigins = env.corsOrigin === '*' ? [] : env.corsOrigin.split(',').map((value) => value.trim()).filter(Boolean)
  const developmentOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1|\d{1,3}(?:\.\d{1,3}){3}):(5173|5174)$/

  console.log('[app] Registering helmet plugin')
  app.register(helmet)
  
  console.log('[app] Registering CORS plugin')
  app.register(cors, {
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) {
        callback(null, true)
        return
      }

      if (env.corsOrigin === '*') {
        callback(null, true)
        return
      }

      if (configuredOrigins.includes(requestOrigin)) {
        callback(null, true)
        return
      }

      if (env.nodeEnv === 'development' && developmentOriginPattern.test(requestOrigin)) {
        callback(null, true)
        return
      }

      callback(new Error('Not allowed by CORS'), false)
    },
    credentials: true,
  })
  
  console.log('[app] Registering rate-limit plugin')
  app.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
  })

  // Add request logging hook
  console.log('[app] Adding onRequest hook')
  app.addHook('onRequest', async (request, reply) => {
    request.startTime = Date.now()
    const method = request.method
    const path = request.url
    console.log(`[api] ${method} ${path}`)
  })

  // Add response logging hook
  console.log('[app] Adding onResponse hook')
  app.addHook('onResponse', async (request, reply) => {
    const duration = Date.now() - (request.startTime || Date.now())
    const method = request.method
    const path = request.url
    const statusCode = reply.statusCode
    console.log(`[api] ${method} ${path} ${statusCode} ${duration}ms`)
  })

  console.log('[app] HOOKS REGISTERED')

  console.log('[app] Registering /health endpoint')
  app.get('/health', healthHandler)

  console.log('[app] Registering routes')
  app.register(registerRoutes, { prefix: env.apiPrefix })

  console.log('[app] ROUTES REGISTERED')

  console.log('[app] Setting not-found handler')
  app.setNotFoundHandler(() => {
    throw new ApiError(404, 'Route not found.')
  })

  console.log('[app] Setting error handler')
  app.setErrorHandler((error, request, reply) => {
    const duration = Date.now() - (request.startTime || Date.now())
    request.log.error({ err: error, duration }, 'Request failed')
    console.error(`[api] Error after ${duration}ms:`, error.message)

    if (isApiError(error)) {
      return reply.status(error.statusCode).send({
        success: false,
        message: error.message,
        ...(error.details ? { errors: error.details } : {}),
      })
    }

    const statusCode = error.statusCode && Number.isInteger(error.statusCode) ? error.statusCode : 500
    const message = statusCode >= 500 ? 'Internal server error' : error.message || 'Request failed'

    return reply.status(statusCode).send({
      success: false,
      message,
    })
  })

  console.log('[app] HANDLERS REGISTERED')
  console.log('[app] EXPORT READY - Fastify app initialized successfully')

  return app
}

export default buildApp
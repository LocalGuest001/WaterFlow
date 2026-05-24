import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { env } from './config/env.js'
import { ApiError, isApiError } from './utils/apiError.js'
import { registerRoutes } from './routes/router.js'
import { healthHandler } from './controllers/deliveryController.js'

export function buildApp() {
  const app = Fastify({
    logger: {
      level: env.nodeEnv === 'development' ? 'info' : 'warn',
    },
  })

  const configuredOrigins = env.corsOrigin === '*' ? [] : env.corsOrigin.split(',').map((value) => value.trim()).filter(Boolean)
  const developmentOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1|\d{1,3}(?:\.\d{1,3}){3}):(5173|5174)$/

  app.register(helmet)
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
  app.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
  })

  app.get('/health', healthHandler)

  app.register(registerRoutes, { prefix: env.apiPrefix })

  app.setNotFoundHandler(() => {
    throw new ApiError(404, 'Route not found.')
  })

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'Request failed')

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

  return app
}

export default buildApp
// Vercel API Route Catch-all Handler
// This catches all /api/* requests and delegates to the Fastify handler

console.log('[api-catch-all] Module loading - setting up catch-all handler for /api')

// Import the handler from server/src/index.js
// This ensures the Fastify app is built and ready when imported
import handler from '../server/src/index.js'

console.log('[api-catch-all] Handler imported:', typeof handler)

// Re-export the handler as default
// Vercel will call this as: handler(req, res) for all /api/* requests
export default handler

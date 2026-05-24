// Vercel API Route Handler for catch-all /api/v1/* requests
// This catches all requests to /api/v1 and subroutes and delegates to Fastify

console.log('[api-v1-catch-all] Module loading - setting up catch-all handler for /api/v1')

// Import the handler from server/src/index.js
// This ensures the Fastify app is built and ready when imported
import handler from '../../server/src/index.js'

console.log('[api-v1-catch-all] Handler imported:', typeof handler)

// Re-export the handler as default
// Vercel will call this as: handler(req, res) for all /api/v1/* requests
export default handler

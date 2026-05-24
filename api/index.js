// Vercel API Route Handler
// This is the entry point for Vercel's serverless functions
// It imports and re-exports the Fastify handler configured in server/src/index.js

console.log('[api-index] Module loading - re-exporting server handler')

// Import the handler from server/src/index.js
// This ensures the Fastify app is built and ready when imported
import handler from '../server/src/index.js'

console.log('[api-index] Handler imported:', typeof handler)

// Re-export the handler as default
// Vercel will call this as: handler(req, res)
export default handler

// Vercel Serverless Handler Entrypoint
// This is the ONLY file Vercel should load as the function entrypoint
// It imports buildApp from the server and creates a Vercel-compatible handler

import { buildApp } from '../server/src/app.js'

console.log('[vercel] handler start')

// Build the app at module load time
const app = buildApp()

console.log('[vercel] app ready - awaiting app.ready()')
// Ensure all plugins are registered before handling requests
await app.ready()

console.log('[vercel] app ready - handler exported')

// Export the handler function for Vercel
// Vercel will invoke this function for each HTTP request
export default async function handler(req, res) {
  console.log('[vercel] request received', { method: req.method, path: req.url })
  
  try {
    // Delegate to Fastify's request routing
    // The app.server is the underlying HTTP server instance
    // We emit the request directly to it
    app.server.emit('request', req, res)
  } catch (error) {
    console.error('[vercel] handler error:', error.message)
    
    // Send error response if headers not sent
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ 
        success: false, 
        message: 'Internal server error' 
      }))
    }
  }
}


import {
  createDeliveryHandler,
  deleteDeliveryHandler,
  getDeliveryHandler,
  listDeliveriesHandler,
  returnAllHandler,
  returnBottleHandler,
  returnCoolerHandler,
  summaryHandler,
  updateDeliveryHandler,
} from '../controllers/deliveryController.js'

// CRITICAL: This must be synchronous for Vercel serverless
// If it's async, Fastify may wait for plugin to complete before ready
export function registerRoutes(app) {
  console.log('[routes] Registering delivery endpoints')
  app.get('/deliveries', listDeliveriesHandler)
  app.get('/deliveries/summary', summaryHandler)
  app.get('/deliveries/:id', getDeliveryHandler)
  app.post('/deliveries', createDeliveryHandler)
  app.patch('/deliveries/:id', updateDeliveryHandler)
  app.delete('/deliveries/:id', deleteDeliveryHandler)
  app.post('/deliveries/:id/return-cooler', returnCoolerHandler)
  app.post('/deliveries/:id/return-bottle', returnBottleHandler)
  app.post('/deliveries/:id/return-all', returnAllHandler)
}
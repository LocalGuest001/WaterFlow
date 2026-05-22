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

export async function registerRoutes(app) {
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
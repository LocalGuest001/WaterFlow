import * as deliveryService from '../services/deliveryService.js'

function ok(message, data = null, pagination = null) {
  return {
    success: true,
    message,
    data,
    ...(pagination ? { pagination } : {}),
  }
}

export async function healthHandler() {
  return ok('Service is healthy.', {
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
}

export async function listDeliveriesHandler(request) {
  const result = await deliveryService.listDeliveries(request.query)
  return ok('Deliveries fetched successfully.', result.data, result.pagination)
}

export async function getDeliveryHandler(request) {
  const delivery = await deliveryService.getDelivery(request.params.id)
  return ok('Delivery fetched successfully.', delivery)
}

export async function createDeliveryHandler(request) {
  const delivery = await deliveryService.createDelivery(request.body)
  return ok('Delivery created successfully.', delivery)
}

export async function updateDeliveryHandler(request) {
  const delivery = await deliveryService.updateDelivery(request.params.id, request.body)
  return ok('Delivery updated successfully.', delivery)
}

export async function deleteDeliveryHandler(request) {
  const result = await deliveryService.deleteDelivery(request.params.id)
  return ok('Delivery deleted successfully.', result)
}

export async function returnCoolerHandler(request) {
  const delivery = await deliveryService.returnCooler(request.params.id)
  return ok('Cooler return processed successfully.', delivery)
}

export async function returnBottleHandler(request) {
  const delivery = await deliveryService.returnBottle(request.params.id)
  return ok('Bottle return processed successfully.', delivery)
}

export async function returnAllHandler(request) {
  const delivery = await deliveryService.returnAll(request.params.id)
  return ok('All returns processed successfully.', delivery)
}

export async function summaryHandler() {
  const summary = await deliveryService.getSummary()
  return ok('Summary fetched successfully.', summary)
}
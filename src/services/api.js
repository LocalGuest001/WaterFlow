const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1'

function getApiOrigin(apiBase = API_BASE) {
  const normalizedBase = apiBase.replace(/\/$/, '')

  try {
    return new URL(normalizedBase).origin
  } catch {
    return normalizedBase.replace(/\/api\/v1$/, '')
  }
}

async function request(path, options = {}) {
  const url = `${API_BASE.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
  const hasBody = options.body !== undefined && options.body !== null
  const headers = {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers ?? {}),
  }
  const opts = {
    ...options,
    headers,
  }

  const res = await fetch(url, opts)
  const text = await res.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch (e) {
    throw new Error(`Invalid JSON response from ${url}`)
  }

  if (!res.ok) {
    const message = body?.message ?? `Request failed: ${res.status}`
    const err = new Error(message)
    err.status = res.status
    err.body = body
    throw err
  }

  return body
}

export async function getDeliveries(query = '') {
  const path = `deliveries${query ? `?${query}` : ''}`
  const res = await request(path, { method: 'GET' })
  return res.data ?? []
}

export async function createDelivery(payload) {
  const res = await request('deliveries', { method: 'POST', body: JSON.stringify(payload) })
  return res.data
}

export async function updateDelivery(id, payload) {
  const res = await request(`deliveries/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  return res.data
}

export async function deleteDelivery(id) {
  const res = await request(`deliveries/${id}`, { method: 'DELETE' })
  return res.data
}

export async function returnCooler(id) {
  const res = await request(`deliveries/${id}/return-cooler`, { method: 'POST' })
  return res.data
}

export async function returnBottle(id) {
  const res = await request(`deliveries/${id}/return-bottle`, { method: 'POST' })
  return res.data
}

export async function returnAll(id) {
  const res = await request(`deliveries/${id}/return-all`, { method: 'POST' })
  return res.data
}

export async function getSummary() {
  const res = await request('deliveries/summary', { method: 'GET' })
  return res.data
}

export async function health() {
  const res = await fetch(`${getApiOrigin()}/health`)
  return res.ok
}

export default { getDeliveries, createDelivery, updateDelivery, deleteDelivery, returnCooler, returnBottle, returnAll, getSummary, health }

import create from 'zustand'
import * as api from '../services/api'

let notificationTimeoutId = null

const createNotification = (message, tone = 'info') => ({
  id: Date.now(),
  message,
  tone,
})

function clearNotificationTimer() {
  if (notificationTimeoutId) {
    window.clearTimeout(notificationTimeoutId)
    notificationTimeoutId = null
  }
}

function scheduleNotificationDismiss(clearNotification) {
  clearNotificationTimer()
  notificationTimeoutId = window.setTimeout(() => {
    clearNotification()
  }, 3500)
}

function normalizeNumber(value) {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : 0
}

function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return value

  const parsedDate = new Date(value)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

function toTime(value) {
  const date = toDate(value)
  return date ? date.getTime() : 0
}

function calculatePending(delivery) {
  const coolersIssued = normalizeNumber(delivery.coolersIssued ?? delivery.coolerTaken)
  const coolersReturned = normalizeNumber(delivery.coolersReturned ?? delivery.coolerReturned)
  const bottlesIssued = normalizeNumber(delivery.bottlesIssued ?? delivery.bottleTaken)
  const bottlesReturned = normalizeNumber(delivery.bottlesReturned ?? delivery.bottleReturned)

  return {
    coolersIssued,
    coolersReturned,
    coolersPending: Math.max(0, coolersIssued - coolersReturned),
    bottlesIssued,
    bottlesReturned,
    bottlesPending: Math.max(0, bottlesIssued - bottlesReturned),
  }
}

function calculateStatus(delivery, referenceDate = new Date()) {
  const pending = calculatePending(delivery)
  const totalPending = pending.coolersPending + pending.bottlesPending

  if (totalPending === 0) {
    return {
      status: 'completed',
      isOverdue: false,
      completedAt: toDate(delivery.completedAt) || referenceDate,
    }
  }

  const createdAt = toDate(delivery.createdAt) || referenceDate
  const overdueThresholdMs = 48 * 60 * 60 * 1000
  const isOverdue = referenceDate.getTime() - createdAt.getTime() >= overdueThresholdMs

  return {
    status: isOverdue ? 'overdue' : 'active',
    isOverdue,
    completedAt: null,
  }
}

function normalizeDeliveryRecord(record) {
  const createdAt = toDate(record.createdAt) || new Date()
  const updatedAt = toDate(record.updatedAt) || createdAt
  const lastActionAt = toDate(record.lastActionAt) || updatedAt
  const pending = calculatePending(record)
  const statusInfo = calculateStatus({ ...record, ...pending, createdAt, updatedAt, lastActionAt })

  return {
    id: record.id,
    customerName: record.customerName ?? '',
    phoneNumber: record.phoneNumber ?? '',
    notes: record.notes ?? '',
    status: statusInfo.status,
    isOverdue: statusInfo.isOverdue,
    createdAt,
    updatedAt,
    completedAt: statusInfo.completedAt ? toDate(statusInfo.completedAt) : null,
    lastActionAt,
    ...pending,
    coolerTaken: pending.coolersIssued,
    coolerReturned: pending.coolersReturned,
    bottleTaken: pending.bottlesIssued,
    bottleReturned: pending.bottlesReturned,
    overdue: statusInfo.status === 'overdue',
  }
}

function sortDeliveries(records) {
  return [...records].sort(
    (left, right) => toTime(right.lastActionAt || right.updatedAt || right.createdAt) - toTime(left.lastActionAt || left.updatedAt || left.createdAt),
  )
}

function buildDeliveryRecord(input, existingRecord = null) {
  const now = new Date()
  const sourceRecord = existingRecord ?? {}
  const currentRecord = {
    ...sourceRecord,
    ...input,
    coolersIssued: Math.max(0, normalizeNumber(input.coolerCount ?? input.coolersIssued ?? sourceRecord.coolersIssued ?? 1)),
    coolersReturned: normalizeNumber(input.coolersReturned ?? sourceRecord.coolersReturned ?? 0),
    bottlesIssued: Math.max(0, normalizeNumber(input.bottleCount ?? input.bottlesIssued ?? sourceRecord.bottlesIssued ?? 0)),
    bottlesReturned: normalizeNumber(input.bottlesReturned ?? sourceRecord.bottlesReturned ?? 0),
    createdAt: toDate(input.createdAt) || toDate(sourceRecord.createdAt) || now,
    updatedAt: now,
    lastActionAt: now,
  }
  const pending = calculatePending(currentRecord)
  const statusInfo = calculateStatus({ ...currentRecord, ...pending })

  return normalizeDeliveryRecord({
    ...currentRecord,
    ...pending,
    status: statusInfo.status,
    isOverdue: statusInfo.isOverdue,
    completedAt: statusInfo.completedAt || null,
  })
}

async function loadDeliveriesSnapshot() {
  const rows = await api.getDeliveries()
  const deliveries = Array.isArray(rows) ? sortDeliveries(rows.map((r) => normalizeDeliveryRecord(r))) : []

  let summary = null
  try {
    summary = await api.getSummary()
  } catch (err) {
    summary = null
  }

  return { deliveries, summary }
}

export const useAppStore = create((set, get) => ({
  deliveries: null,
  summary: null,
  notification: null,

  clearNotification: () => {
    clearNotificationTimer()
    set({ notification: null })
  },

  notify: (message, tone = 'info') => {
    clearNotificationTimer()
    const notification = createNotification(message, tone)
    set({ notification })
    scheduleNotificationDismiss(() => set({ notification: null }))
  },

  initializeDeliveries: () => {
    // Try loading from backend, otherwise show empty state instead of fake records.
    ;(async () => {
      try {
        const snapshot = await loadDeliveriesSnapshot()
        set(snapshot)
        return
      } catch (err) {
        // ignore and fall back to an empty list
      }

      set({ deliveries: [] })
    })()

    return true
  },

  refreshDeliveries: async () => {
    try {
      const rows = await api.getDeliveries()
      if (Array.isArray(rows)) {
        set({ deliveries: sortDeliveries(rows.map((r) => normalizeDeliveryRecord(r))) })
      }
      return true
    } catch (err) {
      get().notify('Failed to refresh deliveries.', 'warning')
      return false
    }
  },

  refreshSnapshot: async ({ silent = false } = {}) => {
    try {
      const snapshot = await loadDeliveriesSnapshot()
      set(snapshot)
      return snapshot
    } catch (err) {
      if (!silent) {
        get().notify('Failed to refresh deliveries.', 'warning')
      }
      return null
    }
  },

  refreshSummary: async () => {
    try {
      const summary = await api.getSummary()
      set({ summary })
      return summary
    } catch (err) {
      get().notify('Failed to refresh summary.', 'warning')
      return null
    }
  },

  addEntry: async (entry) => {
    const customerName = entry.customerName?.trim() ?? ''
    const phoneNumber = entry.phoneNumber?.trim() ?? ''
    const coolerCount = Number(entry.coolerCount ?? 1)
    const bottleCount = Number(entry.bottleCount ?? 0)

    if (!customerName) {
      get().notify('Customer name is required.', 'warning')
      return false
    }

    if (!/^\d{10}$/.test(phoneNumber)) {
      get().notify('Phone number must be exactly 10 digits.', 'warning')
      return false
    }

    if (coolerCount < 0 || bottleCount < 0) {
      get().notify('Delivery counts cannot be negative.', 'warning')
      return false
    }

    try {
      const created = await api.createDelivery({ customerName, phoneNumber, coolerCount, bottleCount, notes: entry.notes ?? '' })
      set((state) => ({ deliveries: sortDeliveries([buildDeliveryRecord(created), ...(state.deliveries ?? [])]) }))
      get().notify('Delivery saved.', 'success')
      return true
    } catch (err) {
      get().notify(err.message || 'Failed to save delivery.', 'danger')
      return false
    }
  },

  updateDelivery: async (deliveryId, updates) => {
    const record = (get().deliveries ?? []).find((item) => item.id === deliveryId)
    if (!record) return false

    const nextCustomerName = updates.customerName ?? record.customerName
    const nextPhoneNumber = updates.phoneNumber ?? record.phoneNumber

    if (!String(nextCustomerName).trim()) {
      get().notify('Customer name is required.', 'warning')
      return false
    }

    if (!/^\d{10}$/.test(String(nextPhoneNumber).trim())) {
      get().notify('Phone number must be exactly 10 digits.', 'warning')
      return false
    }

    try {
      const updated = await api.updateDelivery(deliveryId, updates)
      const next = buildDeliveryRecord(updated)
      set((state) => ({ deliveries: sortDeliveries((state.deliveries ?? []).map((item) => (item.id === deliveryId ? next : item))) }))
      get().notify('Delivery updated.', 'success')
      return true
    } catch (err) {
      get().notify(err.message || 'Failed to update delivery.', 'danger')
      return false
    }
  },

  editDelivery: (deliveryId, updates) => get().updateDelivery(deliveryId, updates),

  returnCooler: async (deliveryId) => {
    try {
      const updated = await api.returnCooler(deliveryId)
      const next = buildDeliveryRecord(updated)
      set((state) => ({ deliveries: sortDeliveries((state.deliveries ?? []).map((item) => (item.id === deliveryId ? next : item))) }))
      get().notify('Cooler returned.', 'success')
      return true
    } catch (err) {
      get().notify(err.message || 'Failed to return cooler.', 'danger')
      return false
    }
  },

  returnBottle: async (deliveryId) => {
    try {
      const updated = await api.returnBottle(deliveryId)
      const next = buildDeliveryRecord(updated)
      set((state) => ({ deliveries: sortDeliveries((state.deliveries ?? []).map((item) => (item.id === deliveryId ? next : item))) }))
      get().notify('Bottle returned.', 'success')
      return true
    } catch (err) {
      get().notify(err.message || 'Failed to return bottle.', 'danger')
      return false
    }
  },

  returnAll: async (deliveryId) => {
    try {
      const updated = await api.returnAll(deliveryId)
      const next = buildDeliveryRecord(updated)
      set((state) => ({ deliveries: sortDeliveries((state.deliveries ?? []).map((item) => (item.id === deliveryId ? next : item))) }))
      get().notify('Delivery completed.', 'success')
      return true
    } catch (err) {
      get().notify(err.message || 'Failed to complete delivery.', 'danger')
      return false
    }
  },

  deleteDelivery: async (deliveryId) => {
    try {
      await api.deleteDelivery(deliveryId)
      set((state) => ({ deliveries: sortDeliveries((state.deliveries ?? []).filter((item) => item.id !== deliveryId)) }))
      get().notify('Delivery deleted.', 'success')
      return true
    } catch (err) {
      get().notify(err.message || 'Failed to delete delivery.', 'danger')
      return false
    }
  },
}))

import create from 'zustand'

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

function createDemoDeliveries() {
  return sortDeliveries([
    buildDeliveryRecord({
      id: '1',
      customerName: 'Ahmed',
      phoneNumber: '9876543210',
      notes: 'Morning drop for the front shop',
      coolerCount: 2,
      bottleCount: 4,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    }),
    buildDeliveryRecord({
      id: '2',
      customerName: 'Nadia',
      phoneNumber: '9123456780',
      notes: 'Completed evening route',
      coolerCount: 1,
      bottleCount: 2,
      coolersReturned: 1,
      bottlesReturned: 2,
      createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    }),
    buildDeliveryRecord({
      id: '3',
      customerName: 'Karim',
      phoneNumber: '9012345678',
      notes: 'Overdue return pending',
      coolerCount: 1,
      bottleCount: 1,
      coolersReturned: 0,
      bottlesReturned: 0,
      createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
    }),
  ])
}

export const useAppStore = create((set, get) => ({
  deliveries: null,
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
    // No backend: initialize with local demo deliveries
    set({ deliveries: createDemoDeliveries() })
    return true
  },

  addEntry: (entry) => {
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

    const id = String(Date.now())
    const next = buildDeliveryRecord({ id, customerName, phoneNumber, notes: entry.notes ?? '', coolerCount, bottleCount })

    set((state) => ({ deliveries: sortDeliveries([next, ...(state.deliveries ?? [])]) }))
    get().notify('Delivery saved.', 'success')
    return true
  },

  updateDelivery: (deliveryId, updates) => {
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

    const merged = buildDeliveryRecord({ ...record, ...updates }, record)

    set((state) => ({
      deliveries: sortDeliveries((state.deliveries ?? []).map((item) => (item.id === deliveryId ? merged : item))),
    }))

    get().notify('Delivery updated.', 'success')
    return true
  },

  editDelivery: (deliveryId, updates) => get().updateDelivery(deliveryId, updates),

  returnCooler: (deliveryId) => {
    const record = (get().deliveries ?? []).find((item) => item.id === deliveryId)
    if (!record || Number(record.coolersPending ?? 0) <= 0) return false

    const next = buildDeliveryRecord({ ...record, coolersReturned: Number(record.coolersReturned ?? 0) + 1 }, record)
    set((state) => ({ deliveries: sortDeliveries((state.deliveries ?? []).map((item) => (item.id === deliveryId ? next : item))) }))
    get().notify('Cooler returned.', 'success')
    return true
  },

  returnBottle: (deliveryId) => {
    const record = (get().deliveries ?? []).find((item) => item.id === deliveryId)
    if (!record || Number(record.bottlesPending ?? 0) <= 0) return false

    const next = buildDeliveryRecord({ ...record, bottlesReturned: Number(record.bottlesReturned ?? 0) + 1 }, record)
    set((state) => ({ deliveries: sortDeliveries((state.deliveries ?? []).map((item) => (item.id === deliveryId ? next : item))) }))
    get().notify('Bottle returned.', 'success')
    return true
  },

  returnAll: (deliveryId) => {
    const record = (get().deliveries ?? []).find((item) => item.id === deliveryId)
    if (!record) return false

    const next = buildDeliveryRecord({ ...record, coolersReturned: record.coolersIssued, bottlesReturned: record.bottlesIssued, completedAt: new Date() }, record)
    set((state) => ({ deliveries: sortDeliveries((state.deliveries ?? []).map((item) => (item.id === deliveryId ? next : item))) }))
    get().notify('Delivery completed.', 'success')
    return true
  },

  deleteDelivery: (deliveryId) => {
    const existing = (get().deliveries ?? []).some((item) => item.id === deliveryId)
    if (!existing) return false

    set((state) => ({ deliveries: sortDeliveries((state.deliveries ?? []).filter((item) => item.id !== deliveryId)) }))
    get().notify('Delivery deleted.', 'success')
    return true
  },
}))

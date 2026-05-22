const OVERDUE_THRESHOLD_MS = 48 * 60 * 60 * 1000

function normalizeNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0
}

function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function toISOString(value) {
  const date = toDate(value)
  return date ? date.toISOString() : null
}

function toCamelCaseDelivery(row) {
  return {
    id: row.id,
    customerName: row.customer_name,
    phoneNumber: row.phone_number,
    notes: row.notes ?? '',
    coolersIssued: normalizeNumber(row.coolers_issued),
    coolersReturned: normalizeNumber(row.coolers_returned),
    bottlesIssued: normalizeNumber(row.bottles_issued),
    bottlesReturned: normalizeNumber(row.bottles_returned),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
    completedAt: toDate(row.completed_at),
    lastActionAt: toDate(row.last_action_at),
    deletedAt: toDate(row.deleted_at),
  }
}

export function getPendingMetrics(delivery) {
  const coolersIssued = normalizeNumber(delivery.coolersIssued)
  const coolersReturned = normalizeNumber(delivery.coolersReturned)
  const bottlesIssued = normalizeNumber(delivery.bottlesIssued)
  const bottlesReturned = normalizeNumber(delivery.bottlesReturned)

  return {
    coolersIssued,
    coolersReturned,
    coolersPending: Math.max(0, coolersIssued - coolersReturned),
    bottlesIssued,
    bottlesReturned,
    bottlesPending: Math.max(0, bottlesIssued - bottlesReturned),
  }
}

export function getStatus(delivery, referenceDate = new Date()) {
  const pending = getPendingMetrics(delivery)
  const totalPending = pending.coolersPending + pending.bottlesPending

  if (totalPending === 0) {
    return {
      status: 'completed',
      isOverdue: false,
      completedAt: toISOString(delivery.completedAt) ?? referenceDate.toISOString(),
    }
  }

  const createdAt = toDate(delivery.createdAt) ?? referenceDate
  const isOverdue = referenceDate.getTime() - createdAt.getTime() >= OVERDUE_THRESHOLD_MS

  return {
    status: isOverdue ? 'overdue' : 'active',
    isOverdue,
    completedAt: null,
  }
}

export function normalizeDelivery(row, referenceDate = new Date()) {
  const delivery = toCamelCaseDelivery(row)
  const pending = getPendingMetrics(delivery)
  const statusInfo = getStatus({ ...delivery, ...pending }, referenceDate)

  return {
    id: delivery.id,
    customerName: delivery.customerName,
    phoneNumber: delivery.phoneNumber,
    notes: delivery.notes,
    status: statusInfo.status,
    isOverdue: statusInfo.isOverdue,
    createdAt: delivery.createdAt,
    updatedAt: delivery.updatedAt,
    completedAt: statusInfo.completedAt ? new Date(statusInfo.completedAt) : null,
    lastActionAt: delivery.lastActionAt,
    deletedAt: delivery.deletedAt,
    ...pending,
    pendingTotal: pending.coolersPending + pending.bottlesPending,
    coolerTaken: pending.coolersIssued,
    coolerReturned: pending.coolersReturned,
    bottleTaken: pending.bottlesIssued,
    bottleReturned: pending.bottlesReturned,
    overdue: statusInfo.status === 'overdue',
  }
}

export function clampDeliveryCounts(delivery) {
  return {
    coolersIssued: normalizeNumber(delivery.coolersIssued),
    coolersReturned: normalizeNumber(delivery.coolersReturned),
    bottlesIssued: normalizeNumber(delivery.bottlesIssued),
    bottlesReturned: normalizeNumber(delivery.bottlesReturned),
  }
}
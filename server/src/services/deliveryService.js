import { randomUUID } from 'node:crypto'
import { pool } from '../db/pool.js'
import { ApiError } from '../utils/apiError.js'
import { clampDeliveryCounts, getPendingMetrics, normalizeDelivery } from '../domain/delivery.js'

function statusExpression(alias = 'd') {
  const coolersPending = `GREATEST(${alias}.coolers_issued - ${alias}.coolers_returned, 0)`
  const bottlesPending = `GREATEST(${alias}.bottles_issued - ${alias}.bottles_returned, 0)`
  return `CASE WHEN (${coolersPending} + ${bottlesPending}) = 0 THEN 'completed' WHEN ${alias}.created_at <= NOW() - INTERVAL '48 hours' THEN 'overdue' ELSE 'active' END`
}

function selectColumns(alias = 'd') {
  const coolersPending = `GREATEST(${alias}.coolers_issued - ${alias}.coolers_returned, 0)`
  const bottlesPending = `GREATEST(${alias}.bottles_issued - ${alias}.bottles_returned, 0)`

  return `
    ${alias}.id,
    ${alias}.customer_name,
    ${alias}.phone_number,
    ${alias}.notes,
    ${alias}.coolers_issued,
    ${alias}.coolers_returned,
    ${alias}.bottles_issued,
    ${alias}.bottles_returned,
    ${alias}.created_at,
    ${alias}.updated_at,
    ${alias}.completed_at,
    ${alias}.last_action_at,
    ${alias}.deleted_at,
    ${coolersPending} AS "coolersPending",
    ${bottlesPending} AS "bottlesPending",
    (${coolersPending} + ${bottlesPending}) AS "pendingTotal",
    ${statusExpression(alias)} AS status,
    CASE WHEN ${statusExpression(alias)} = 'overdue' THEN true ELSE false END AS "isOverdue"
  `
}

function buildWhereClauses(filters) {
  const clauses = ['d.deleted_at IS NULL']
  const params = []

  if (filters.q) {
    clauses.push(`(d.customer_name ILIKE $${params.length + 1} OR d.phone_number ILIKE $${params.length + 1})`)
    params.push(`%${filters.q}%`)
  }

  if (filters.status && filters.status !== 'all') {
    clauses.push(`${statusExpression('d')} = $${params.length + 1}`)
    params.push(filters.status)
  }

  return { clauses, params }
}

function sanitizeSort(sortBy = 'lastActionAt', sortOrder = 'desc') {
  const allowedColumns = {
    createdAt: 'd.created_at',
    updatedAt: 'd.updated_at',
    lastActionAt: 'd.last_action_at',
    completedAt: 'd.completed_at',
    customerName: 'd.customer_name',
  }

  const column = allowedColumns[sortBy] ?? allowedColumns.lastActionAt
  const direction = String(sortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC'

  return `${column} ${direction}, d.id DESC`
}

function normalizeListOptions(options = {}) {
  const page = Number.parseInt(options.page ?? 1, 10)
  const limit = Number.parseInt(options.limit ?? 50, 10)

  return {
    q: typeof options.q === 'string' ? options.q.trim() : '',
    status: typeof options.status === 'string' ? options.status.trim() : 'all',
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 50,
    sortBy: typeof options.sortBy === 'string' ? options.sortBy : 'lastActionAt',
    sortOrder: typeof options.sortOrder === 'string' ? options.sortOrder : 'desc',
  }
}

function assertUuid(id) {
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new ApiError(400, 'Invalid delivery id.')
  }
}

function validateDeliveryInput(payload, { partial = false } = {}) {
  const customerName = payload.customerName
  const phoneNumber = payload.phoneNumber
  const notes = payload.notes
  const coolersIssued = payload.coolersIssued ?? payload.coolerCount
  const coolersReturned = payload.coolersReturned
  const bottlesIssued = payload.bottlesIssued ?? payload.bottleCount
  const bottlesReturned = payload.bottlesReturned

  if (!partial || customerName !== undefined) {
    if (typeof customerName !== 'string' || !customerName.trim()) {
      throw new ApiError(400, 'Customer name is required.')
    }
  }

  if (!partial || phoneNumber !== undefined) {
    if (typeof phoneNumber !== 'string' || !/^\d{10}$/.test(phoneNumber.trim())) {
      throw new ApiError(400, 'Phone number must be exactly 10 digits.')
    }
  }

  for (const [fieldName, fieldValue] of [
    ['coolersIssued', coolersIssued],
    ['coolersReturned', coolersReturned],
    ['bottlesIssued', bottlesIssued],
    ['bottlesReturned', bottlesReturned],
  ]) {
    if (fieldValue === undefined) continue
    const parsedValue = Number(fieldValue)
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      throw new ApiError(400, `${fieldName} must be a non-negative number.`)
    }
  }

  return {
    customerName: typeof customerName === 'string' ? customerName.trim() : undefined,
    phoneNumber: typeof phoneNumber === 'string' ? phoneNumber.trim() : undefined,
    notes: typeof notes === 'string' ? notes : undefined,
    coolersIssued: coolersIssued === undefined ? undefined : Math.floor(Number(coolersIssued)),
    coolersReturned: coolersReturned === undefined ? undefined : Math.floor(Number(coolersReturned)),
    bottlesIssued: bottlesIssued === undefined ? undefined : Math.floor(Number(bottlesIssued)),
    bottlesReturned: bottlesReturned === undefined ? undefined : Math.floor(Number(bottlesReturned)),
  }
}

function assertConsistentCounts(delivery) {
  if (delivery.coolersReturned > delivery.coolersIssued || delivery.bottlesReturned > delivery.bottlesIssued) {
    throw new ApiError(400, 'Returned counts cannot exceed issued counts.')
  }
}

async function findDeliveryOrThrow(id) {
  assertUuid(id)
  const result = await pool.query(
    `
      SELECT ${selectColumns('d')}
      FROM deliveries d
      WHERE d.id = $1 AND d.deleted_at IS NULL
    `,
    [id],
  )

  const row = result.rows[0]
  if (!row) {
    throw new ApiError(404, 'Delivery not found.')
  }

  return normalizeDelivery(row)
}

function combineDelivery(existing, patch) {
  const merged = {
    ...existing,
    ...patch,
    customerName: patch.customerName ?? existing.customerName,
    phoneNumber: patch.phoneNumber ?? existing.phoneNumber,
    notes: patch.notes ?? existing.notes ?? '',
    coolersIssued: patch.coolersIssued ?? existing.coolersIssued,
    coolersReturned: patch.coolersReturned ?? existing.coolersReturned,
    bottlesIssued: patch.bottlesIssued ?? existing.bottlesIssued,
    bottlesReturned: patch.bottlesReturned ?? existing.bottlesReturned,
  }

  return {
    ...merged,
    ...clampDeliveryCounts(merged),
  }
}

function finalizeDeliveryState(delivery, now = new Date()) {
  const pending = getPendingMetrics(delivery)
  const completed = pending.coolersPending + pending.bottlesPending === 0

  return {
    ...delivery,
    completedAt: completed ? (delivery.completedAt ?? now) : null,
  }
}

export async function listDeliveries(options = {}) {
  const filters = normalizeListOptions(options)
  const { clauses, params } = buildWhereClauses(filters)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const sortClause = sanitizeSort(filters.sortBy, filters.sortOrder)

  const countResult = await pool.query(
    `
      SELECT COUNT(*)::int AS count
      FROM deliveries d
      ${whereClause}
    `,
    params,
  )

  const listResult = await pool.query(
    `
      SELECT ${selectColumns('d')}
      FROM deliveries d
      ${whereClause}
      ORDER BY ${sortClause}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `,
    [...params, filters.limit, (filters.page - 1) * filters.limit],
  )

  const total = countResult.rows[0]?.count ?? 0
  const data = listResult.rows.map((row) => normalizeDelivery(row))

  return {
    data,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    },
  }
}

export async function getDelivery(id) {
  return findDeliveryOrThrow(id)
}

export async function createDelivery(payload) {
  const input = validateDeliveryInput(payload, { partial: false })
  const now = new Date()
  const id = randomUUID()
  const prepared = finalizeDeliveryState(
    {
      id,
      customerName: input.customerName,
      phoneNumber: input.phoneNumber,
      notes: input.notes ?? '',
      coolersIssued: input.coolersIssued ?? 1,
      coolersReturned: 0,
      bottlesIssued: input.bottlesIssued ?? 0,
      bottlesReturned: 0,
      createdAt: now,
      updatedAt: now,
      lastActionAt: now,
      completedAt: null,
    },
    now,
  )
  assertConsistentCounts(prepared)

  const result = await pool.query(
    `
      INSERT INTO deliveries (
        id, customer_name, phone_number, notes,
        coolers_issued, coolers_returned, bottles_issued, bottles_returned,
        created_at, updated_at, completed_at, last_action_at, deleted_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11, $12, NULL
      )
      RETURNING *
    `,
    [
      prepared.id,
      prepared.customerName,
      prepared.phoneNumber,
      prepared.notes,
      prepared.coolersIssued,
      prepared.coolersReturned,
      prepared.bottlesIssued,
      prepared.bottlesReturned,
      prepared.createdAt,
      prepared.updatedAt,
      prepared.completedAt,
      prepared.lastActionAt,
    ],
  )

  return normalizeDelivery(result.rows[0])
}

export async function updateDelivery(id, payload) {
  const existing = await findDeliveryOrThrow(id)
  const input = validateDeliveryInput(payload, { partial: true })
  const merged = finalizeDeliveryState(combineDelivery(existing, input))
  assertConsistentCounts(merged)
  const now = new Date()

  const result = await pool.query(
    `
      UPDATE deliveries
      SET
        customer_name = $2,
        phone_number = $3,
        notes = $4,
        coolers_issued = $5,
        coolers_returned = $6,
        bottles_issued = $7,
        bottles_returned = $8,
        updated_at = $9,
        last_action_at = $9,
        completed_at = $10
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `,
    [
      id,
      merged.customerName,
      merged.phoneNumber,
      merged.notes ?? '',
      merged.coolersIssued,
      merged.coolersReturned,
      merged.bottlesIssued,
      merged.bottlesReturned,
      now,
      merged.completedAt,
    ],
  )

  return normalizeDelivery(result.rows[0])
}

export async function deleteDelivery(id) {
  await findDeliveryOrThrow(id)

  const result = await pool.query(
    `
      UPDATE deliveries
      SET deleted_at = NOW(), updated_at = NOW(), last_action_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id
    `,
    [id],
  )

  if (!result.rowCount) {
    throw new ApiError(404, 'Delivery not found.')
  }

  return { id }
}

export async function returnCooler(id) {
  const existing = await findDeliveryOrThrow(id)
  if (existing.coolersPending <= 0) {
    return existing
  }

  const now = new Date()
  const final = finalizeDeliveryState(
    {
      ...existing,
      coolersReturned: existing.coolersReturned + 1,
    },
    now,
  )

  const result = await pool.query(
    `
      UPDATE deliveries
      SET coolers_returned = $2, updated_at = $3, last_action_at = $3, completed_at = $4
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `,
    [id, final.coolersReturned, now, final.completedAt],
  )

  return normalizeDelivery(result.rows[0])
}

export async function returnBottle(id) {
  const existing = await findDeliveryOrThrow(id)
  if (existing.bottlesPending <= 0) {
    return existing
  }

  const now = new Date()
  const final = finalizeDeliveryState(
    {
      ...existing,
      bottlesReturned: existing.bottlesReturned + 1,
    },
    now,
  )

  const result = await pool.query(
    `
      UPDATE deliveries
      SET bottles_returned = $2, updated_at = $3, last_action_at = $3, completed_at = $4
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `,
    [id, final.bottlesReturned, now, final.completedAt],
  )

  return normalizeDelivery(result.rows[0])
}

export async function returnAll(id) {
  const existing = await findDeliveryOrThrow(id)
  if (existing.pendingTotal <= 0) {
    return existing
  }

  const now = new Date()
  const result = await pool.query(
    `
      UPDATE deliveries
      SET
        coolers_returned = coolers_issued,
        bottles_returned = bottles_issued,
        updated_at = $2,
        last_action_at = $2,
        completed_at = $2
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `,
    [id, now],
  )

  return normalizeDelivery(result.rows[0])
}

export async function getSummary() {
  const result = await pool.query(`
    SELECT
      COUNT(*)::int AS "totalDeliveries",
      COUNT(*) FILTER (WHERE ${statusExpression('d')} = 'active')::int AS "activeDeliveries",
      COUNT(*) FILTER (WHERE ${statusExpression('d')} = 'overdue')::int AS "overdueDeliveries",
      COUNT(*) FILTER (WHERE ${statusExpression('d')} = 'completed')::int AS "completedDeliveries",
      COALESCE(SUM(GREATEST(d.coolers_issued - d.coolers_returned, 0)), 0)::int AS "pendingCoolers",
      COALESCE(SUM(GREATEST(d.bottles_issued - d.bottles_returned, 0)), 0)::int AS "pendingBottles"
    FROM deliveries d
    WHERE d.deleted_at IS NULL
  `)

  const row = result.rows[0] ?? {}
  return {
    totalDeliveries: row.totalDeliveries ?? 0,
    activeDeliveries: row.activeDeliveries ?? 0,
    overdueDeliveries: row.overdueDeliveries ?? 0,
    completedDeliveries: row.completedDeliveries ?? 0,
    pendingCoolers: row.pendingCoolers ?? 0,
    pendingBottles: row.pendingBottles ?? 0,
  }
}
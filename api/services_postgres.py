import uuid
from datetime import datetime, timezone

try:
    from .db import query, query_one, execute
    from .errors import ApiError
except Exception:
    from db import query, query_one, execute
    from errors import ApiError


OVERDUE_THRESHOLD_SECONDS = 48 * 60 * 60


def _status_expression(alias='d'):
    coolers_pending = f"GREATEST({alias}.coolers_issued - {alias}.coolers_returned, 0)"
    bottles_pending = f"GREATEST({alias}.bottles_issued - {alias}.bottles_returned, 0)"
    return f"CASE WHEN ({coolers_pending} + {bottles_pending}) = 0 THEN 'completed' WHEN {alias}.created_at <= NOW() - INTERVAL '48 hours' THEN 'overdue' ELSE 'active' END"


def _select_columns(alias='d'):
    coolers_pending = f"GREATEST({alias}.coolers_issued - {alias}.coolers_returned, 0)"
    bottles_pending = f"GREATEST({alias}.bottles_issued - {alias}.bottles_returned, 0)"
    return f'''
    {alias}.id,
    {alias}.customer_name,
    {alias}.phone_number,
    {alias}.notes,
    {alias}.coolers_issued,
    {alias}.coolers_returned,
    {alias}.bottles_issued,
    {alias}.bottles_returned,
    {alias}.created_at,
    {alias}.updated_at,
    {alias}.completed_at,
    {alias}.last_action_at,
    {alias}.deleted_at,
    {coolers_pending} AS coolersPending,
    {bottles_pending} AS bottlesPending,
    ({coolers_pending} + {bottles_pending}) AS pendingTotal,
    {_status_expression(alias)} AS status,
    CASE WHEN {_status_expression(alias)} = 'overdue' THEN true ELSE false END AS isOverdue
    '''


def _normalize_row(row):
    # Map DB row keys to frontend-friendly names and python types
    if not row:
        return None
    return {
        'id': row.get('id'),
        'customerName': row.get('customer_name'),
        'phoneNumber': row.get('phone_number'),
        'notes': row.get('notes') or '',
        'coolersIssued': int(row.get('coolers_issued') or 0),
        'coolersReturned': int(row.get('coolers_returned') or 0),
        'bottlesIssued': int(row.get('bottles_issued') or 0),
        'bottlesReturned': int(row.get('bottles_returned') or 0),
        'createdAt': row.get('created_at'),
        'updatedAt': row.get('updated_at'),
        'completedAt': row.get('completed_at'),
        'lastActionAt': row.get('last_action_at'),
        'deletedAt': row.get('deleted_at'),
        'coolersPending': int(row.get('coolerspending') or row.get('coolersPending') or 0),
        'bottlesPending': int(row.get('bottlespending') or row.get('bottlesPending') or 0),
        'pendingTotal': int(row.get('pendingtotal') or row.get('pendingTotal') or 0),
        'status': row.get('status'),
        'isOverdue': bool(row.get('isoverdue') or row.get('isOverdue') or False),
        'coolerTaken': int(row.get('coolers_issued') or 0),
        'coolerReturned': int(row.get('coolers_returned') or 0),
        'bottleTaken': int(row.get('bottles_issued') or 0),
        'bottleReturned': int(row.get('bottles_returned') or 0),
        'overdue': (row.get('status') == 'overdue'),
    }


def _assert_uuid(id_):
    if not isinstance(id_, str):
        raise ApiError(400, 'Invalid delivery id.')
    try:
        uuid.UUID(id_)
    except Exception:
        raise ApiError(400, 'Invalid delivery id.')


def _sanitize_list_options(options: dict):
    page = int(options.get('page', 1) or 1)
    limit = int(options.get('limit', 50) or 50)
    return {
        'q': (options.get('q') or '').strip(),
        'status': (options.get('status') or 'all').strip(),
        'page': page if page > 0 else 1,
        'limit': min(limit, 100) if limit > 0 else 50,
        'sortBy': options.get('sort_by') or options.get('sortBy') or 'lastActionAt',
        'sortOrder': options.get('sort_order') or options.get('sortOrder') or 'desc',
    }


def _sanitize_sort(sort_by: str, sort_order: str):
    allowed = {
        'createdAt': 'd.created_at',
        'updatedAt': 'd.updated_at',
        'lastActionAt': 'd.last_action_at',
        'completedAt': 'd.completed_at',
        'customerName': 'd.customer_name',
    }
    col = allowed.get(sort_by, 'd.last_action_at')
    dir_ = 'ASC' if str(sort_order).lower() == 'asc' else 'DESC'
    return f"{col} {dir_}, d.id DESC"


def list_deliveries(**options):
    filters = _sanitize_list_options(options)
    clauses = ['d.deleted_at IS NULL']
    params = []

    if filters['q']:
        params.append(f"%{filters['q']}%")
        clauses.append(f"(d.customer_name ILIKE %s OR d.phone_number ILIKE %s)")
        # Note: duplicate param for both placeholders
        params.append(params[-1])

    if filters['status'] and filters['status'] != 'all':
        clauses.append(f"{_status_expression('d')} = %s")
        params.append(filters['status'])

    where = ' AND '.join(clauses)
    sort_clause = _sanitize_sort(filters['sortBy'], filters['sortOrder'])

    count_sql = f"SELECT COUNT(*)::int AS count FROM deliveries d WHERE {where}"
    count_res = query_one(count_sql, tuple(params))
    total = int(count_res.get('count') or 0)

    list_sql = f"SELECT {_select_columns('d')} FROM deliveries d WHERE {where} ORDER BY {sort_clause} LIMIT %s OFFSET %s"
    params2 = params + [filters['limit'], (filters['page'] - 1) * filters['limit']]
    rows = query(list_sql, tuple(params2))
    data = [ _normalize_row(r) for r in rows ]

    return {
        'data': data,
        'pagination': {
            'page': filters['page'],
            'limit': filters['limit'],
            'total': total,
            'totalPages': max(1, (total + filters['limit'] - 1) // filters['limit']),
        },
    }


def get_delivery(delivery_id: str):
    _assert_uuid(delivery_id)
    row = query_one(f"SELECT {_select_columns('d')} FROM deliveries d WHERE d.id = %s AND d.deleted_at IS NULL", (delivery_id,))
    if not row:
        raise ApiError(404, 'Delivery not found.')
    return _normalize_row(row)


def create_delivery(payload):
    # payload expected as dict-like with camelCase or snake_case keys; accept both
    customer = payload.get('customerName') or payload.get('customer_name')
    phone = payload.get('phoneNumber') or payload.get('phone_number')
    notes = payload.get('notes') or ''
    coolers = int(payload.get('coolersIssued') or payload.get('coolerCount') or 1)
    bottles = int(payload.get('bottlesIssued') or payload.get('bottleCount') or 0)

    if not customer or not str(customer).strip():
        raise ApiError(400, 'Customer name is required.')
    if not phone or not str(phone).strip() or not str(phone).strip().isdigit() or len(str(phone).strip()) != 10:
        raise ApiError(400, 'Phone number must be exactly 10 digits.')

    now = datetime.now(timezone.utc)
    id_ = str(uuid.uuid4())
    execute(
        """
        INSERT INTO deliveries (id, customer_name, phone_number, notes, coolers_issued, coolers_returned, bottles_issued, bottles_returned, created_at, updated_at, completed_at, last_action_at, deleted_at)
        VALUES (%s,%s,%s,%s,%s,0,%s,0,%s,%s,NULL,%s,NULL)
        RETURNING *
        """,
        (id_, customer.strip(), phone.strip(), notes, coolers, bottles, now, now, now),
    )
    row = query_one("SELECT _.* FROM deliveries _ WHERE id = %s", (id_,))
    return _normalize_row(row)


def update_delivery(delivery_id: str, payload):
    _assert_uuid(delivery_id)
    existing = query_one(f"SELECT {_select_columns('d')} FROM deliveries d WHERE d.id = %s AND d.deleted_at IS NULL", (delivery_id,))
    if not existing:
        raise ApiError(404, 'Delivery not found.')

    # Build merged values
    cust = payload.get('customerName') or payload.get('customer_name') or existing.get('customer_name')
    phone = payload.get('phoneNumber') or payload.get('phone_number') or existing.get('phone_number')
    notes = payload.get('notes') if ('notes' in payload or 'notes' in payload) else existing.get('notes')
    coolers_issued = payload.get('coolersIssued') if payload.get('coolersIssued') is not None else existing.get('coolers_issued')
    coolers_returned = payload.get('coolersReturned') if payload.get('coolersReturned') is not None else existing.get('coolers_returned')
    bottles_issued = payload.get('bottlesIssued') if payload.get('bottlesIssued') is not None else existing.get('bottles_issued')
    bottles_returned = payload.get('bottlesReturned') if payload.get('bottlesReturned') is not None else existing.get('bottles_returned')

    # validations
    if not cust or not str(cust).strip():
        raise ApiError(400, 'Customer name is required.')
    if not phone or not str(phone).strip() or not str(phone).strip().isdigit() or len(str(phone).strip()) != 10:
        raise ApiError(400, 'Phone number must be exactly 10 digits.')

    # ensure non-negative
    for name, val in [('coolersIssued', coolers_issued), ('coolersReturned', coolers_returned), ('bottlesIssued', bottles_issued), ('bottlesReturned', bottles_returned)]:
        if val is not None:
            try:
                if int(val) < 0:
                    raise ApiError(400, f'{name} must be a non-negative number.')
            except ValueError:
                raise ApiError(400, f'{name} must be a non-negative number.')

    now = datetime.now(timezone.utc)
    execute(
        """
        UPDATE deliveries SET
          customer_name = %s,
          phone_number = %s,
          notes = %s,
          coolers_issued = %s,
          coolers_returned = %s,
          bottles_issued = %s,
          bottles_returned = %s,
          updated_at = %s,
          last_action_at = %s,
          completed_at = CASE WHEN (GREATEST(coolers_issued - coolers_returned,0) + GREATEST(bottles_issued - bottles_returned,0)) = 0 THEN %s ELSE NULL END
        WHERE id = %s AND deleted_at IS NULL
        RETURNING *
        """,
        (
            cust.strip(),
            phone.strip(),
            notes if notes is not None else '',
            int(coolers_issued),
            int(coolers_returned) if coolers_returned is not None else 0,
            int(bottles_issued),
            int(bottles_returned) if bottles_returned is not None else 0,
            now,
            now,
            now,
            delivery_id,
        ),
    )

    row = query_one(f"SELECT {_select_columns('d')} FROM deliveries d WHERE d.id = %s", (delivery_id,))
    return _normalize_row(row)


def delete_delivery(delivery_id: str):
    _assert_uuid(delivery_id)
    res = execute("UPDATE deliveries SET deleted_at = NOW(), updated_at = NOW(), last_action_at = NOW() WHERE id = %s AND deleted_at IS NULL RETURNING id", (delivery_id,))
    if not res:
        raise ApiError(404, 'Delivery not found.')
    return {'id': delivery_id}


def return_cooler(delivery_id: str):
    _assert_uuid(delivery_id)
    existing = query_one(f"SELECT {_select_columns('d')} FROM deliveries d WHERE d.id = %s AND d.deleted_at IS NULL", (delivery_id,))
    if not existing:
        raise ApiError(404, 'Delivery not found.')
    if existing.get('coolersPending', 0) <= 0:
        return _normalize_row(existing)

    # increment safely
    execute("UPDATE deliveries SET coolers_returned = coolers_returned + 1, updated_at = NOW(), last_action_at = NOW(), completed_at = CASE WHEN (GREATEST(coolers_issued - (coolers_returned + 1),0) + GREATEST(bottles_issued - bottles_returned,0)) = 0 THEN NOW() ELSE NULL END WHERE id = %s RETURNING *", (delivery_id,))
    row = query_one(f"SELECT {_select_columns('d')} FROM deliveries d WHERE d.id = %s", (delivery_id,))
    return _normalize_row(row)


def return_bottle(delivery_id: str):
    _assert_uuid(delivery_id)
    existing = query_one(f"SELECT {_select_columns('d')} FROM deliveries d WHERE d.id = %s AND d.deleted_at IS NULL", (delivery_id,))
    if not existing:
        raise ApiError(404, 'Delivery not found.')
    if existing.get('bottlesPending', 0) <= 0:
        return _normalize_row(existing)

    execute("UPDATE deliveries SET bottles_returned = bottles_returned + 1, updated_at = NOW(), last_action_at = NOW(), completed_at = CASE WHEN (GREATEST(coolers_issued - coolers_returned,0) + GREATEST(bottles_issued - (bottles_returned + 1),0)) = 0 THEN NOW() ELSE NULL END WHERE id = %s RETURNING *", (delivery_id,))
    row = query_one(f"SELECT {_select_columns('d')} FROM deliveries d WHERE d.id = %s", (delivery_id,))
    return _normalize_row(row)


def return_all(delivery_id: str):
    _assert_uuid(delivery_id)
    existing = query_one(f"SELECT {_select_columns('d')} FROM deliveries d WHERE d.id = %s AND d.deleted_at IS NULL", (delivery_id,))
    if not existing:
        raise ApiError(404, 'Delivery not found.')
    if existing.get('pendingTotal', 0) <= 0:
        return _normalize_row(existing)

    execute("UPDATE deliveries SET coolers_returned = coolers_issued, bottles_returned = bottles_issued, updated_at = NOW(), last_action_at = NOW(), completed_at = NOW() WHERE id = %s AND deleted_at IS NULL RETURNING *", (delivery_id,))
    row = query_one(f"SELECT {_select_columns('d')} FROM deliveries d WHERE d.id = %s", (delivery_id,))
    return _normalize_row(row)


def get_summary():
    sql = f"""
    SELECT
      COUNT(*)::int AS totalDeliveries,
      COUNT(*) FILTER (WHERE {_status_expression('d')} = 'active')::int AS activeDeliveries,
      COUNT(*) FILTER (WHERE {_status_expression('d')} = 'overdue')::int AS overdueDeliveries,
      COUNT(*) FILTER (WHERE {_status_expression('d')} = 'completed')::int AS completedDeliveries,
      COALESCE(SUM(GREATEST(d.coolers_issued - d.coolers_returned, 0)), 0)::int AS pendingCoolers,
      COALESCE(SUM(GREATEST(d.bottles_issued - d.bottles_returned, 0)), 0)::int AS pendingBottles
    FROM deliveries d
    WHERE d.deleted_at IS NULL
    """
    row = query_one(sql)
    return {
        'totalDeliveries': int(row.get('totaldeliveries') or row.get('totalDeliveries') or 0),
        'activeDeliveries': int(row.get('activedeliveries') or row.get('activeDeliveries') or 0),
        'overdueDeliveries': int(row.get('overduedeliveries') or row.get('overdueDeliveries') or 0),
        'completedDeliveries': int(row.get('completeddeliveries') or row.get('completedDeliveries') or 0),
        'pendingCoolers': int(row.get('pendingcoolers') or row.get('pendingCoolers') or 0),
        'pendingBottles': int(row.get('pendingbottles') or row.get('pendingBottles') or 0),
    }


class DeliveryServiceProxy:
    list_deliveries = staticmethod(list_deliveries)
    get_delivery = staticmethod(get_delivery)
    create_delivery = staticmethod(create_delivery)
    update_delivery = staticmethod(update_delivery)
    delete_delivery = staticmethod(delete_delivery)
    return_cooler = staticmethod(return_cooler)
    return_bottle = staticmethod(return_bottle)
    return_all = staticmethod(return_all)
    get_summary = staticmethod(get_summary)


delivery_service = DeliveryServiceProxy()

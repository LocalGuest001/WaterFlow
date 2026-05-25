from uuid import UUID

from fastapi import APIRouter, Query

try:
    from .schemas import DeliveryCreate, DeliveryUpdate
    from .services import delivery_service
except Exception:
    from schemas import DeliveryCreate, DeliveryUpdate
    from services import delivery_service


router = APIRouter()


@router.get('/deliveries')
async def list_deliveries(
    q: str | None = Query(default=None),
    status: str = Query(default='all'),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    sort_by: str = Query(default='lastActionAt'),
    sort_order: str = Query(default='desc'),
):
    return delivery_service.list_deliveries(
        q=q,
        status=status,
        page=page,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get('/deliveries/summary')
async def get_summary():
    return delivery_service.get_summary()


@router.get('/deliveries/{delivery_id}')
async def get_delivery(delivery_id: UUID):
    return delivery_service.get_delivery(delivery_id)


@router.post('/deliveries')
async def create_delivery(payload: DeliveryCreate):
    return delivery_service.create_delivery(payload.model_dump(by_alias=True))


@router.patch('/deliveries/{delivery_id}')
async def update_delivery(delivery_id: UUID, payload: DeliveryUpdate):
    return delivery_service.update_delivery(delivery_id, payload.model_dump(by_alias=True, exclude_none=True))


@router.delete('/deliveries/{delivery_id}')
async def delete_delivery(delivery_id: UUID):
    return delivery_service.delete_delivery(delivery_id)


@router.post('/deliveries/{delivery_id}/return-cooler')
async def return_cooler(delivery_id: UUID):
    return delivery_service.return_cooler(delivery_id)


@router.post('/deliveries/{delivery_id}/return-bottle')
async def return_bottle(delivery_id: UUID):
    return delivery_service.return_bottle(delivery_id)


@router.post('/deliveries/{delivery_id}/return-all')
async def return_all(delivery_id: UUID):
    return delivery_service.return_all(delivery_id)

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


DeliveryStatus = Literal['active', 'overdue', 'completed']


def to_camel(value: str) -> str:
    parts = value.split('_')
    return parts[0] + ''.join(part.capitalize() for part in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)


class Pagination(CamelModel):
    page: int
    limit: int
    total: int
    total_pages: int


class ApiResponse(CamelModel):
    success: bool = True
    message: str
    data: Any = None
    pagination: Pagination | None = None


class DeliveryCreate(CamelModel):
    customer_name: str
    phone_number: str = Field(pattern=r'^\d{10}$')
    notes: str = ''
    coolers_issued: int = 1
    coolers_returned: int = 0
    bottles_issued: int = 0
    bottles_returned: int = 0


class DeliveryUpdate(CamelModel):
    customer_name: str | None = None
    phone_number: str | None = Field(default=None, pattern=r'^\d{10}$')
    notes: str | None = None
    coolers_issued: int | None = None
    coolers_returned: int | None = None
    bottles_issued: int | None = None
    bottles_returned: int | None = None


class DeliveryRead(CamelModel):
    id: UUID
    customer_name: str
    phone_number: str
    notes: str = ''
    status: DeliveryStatus
    is_overdue: bool
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None
    last_action_at: datetime
    deleted_at: datetime | None = None
    coolers_issued: int
    coolers_returned: int
    bottles_issued: int
    bottles_returned: int
    coolers_pending: int
    bottles_pending: int
    pending_total: int
    cooler_taken: int
    cooler_returned: int
    bottle_taken: int
    bottle_returned: int
    overdue: bool


class DeliverySummary(CamelModel):
    total_deliveries: int
    active_deliveries: int
    overdue_deliveries: int
    completed_deliveries: int
    pending_coolers: int
    pending_bottles: int

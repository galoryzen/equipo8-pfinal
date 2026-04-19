from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from uuid import UUID


@dataclass(frozen=True)
class BookingForPayment:
    id: UUID
    status: str
    total_amount: Decimal
    currency_code: str
    hold_expires_at: datetime | None

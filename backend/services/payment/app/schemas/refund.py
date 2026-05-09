from pydantic import BaseModel
from datetime import datetime


class RefundOut(BaseModel):
    amount: str
    status: str
    reason: str | None
    created_at: datetime

    class Config:
        from_attributes = True

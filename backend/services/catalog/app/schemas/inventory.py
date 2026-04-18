from datetime import date
from uuid import UUID

from pydantic import BaseModel, model_validator


class HoldRequest(BaseModel):
    room_type_id: UUID
    checkin: date
    checkout: date

    @model_validator(mode="after")
    def checkout_after_checkin(self) -> "HoldRequest":
        if self.checkout <= self.checkin:
            raise ValueError("checkout must be after checkin")
        return self

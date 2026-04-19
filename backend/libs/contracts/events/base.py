import uuid
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class DomainEventEnvelope(BaseModel):
    event_id: UUID = Field(default_factory=uuid.uuid4)
    event_type: str
    occurred_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    payload: dict[str, Any]

    def to_json(self) -> str:
        return self.model_dump_json()

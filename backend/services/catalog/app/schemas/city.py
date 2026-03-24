from uuid import UUID

from pydantic import BaseModel


class CityOut(BaseModel):
    id: UUID
    name: str
    department: str | None = None
    country: str


class FeaturedDestinationOut(BaseModel):
    id: UUID
    name: str
    department: str | None = None
    country: str
    image_url: str | None = None

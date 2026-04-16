from datetime import date
from uuid import UUID

from app.application.ports.outbound.booking_repository import BookingRepository
from app.schemas.booking import HeldRoomsOut


class GetHeldRoomsUseCase:
    def __init__(self, repo: BookingRepository):
        self._repo = repo

    async def execute(
        self,
        property_id: UUID,
        checkin: date,
        checkout: date,
    ) -> HeldRoomsOut:
        ids = await self._repo.find_held_room_type_ids(
            property_id=property_id,
            checkin=checkin,
            checkout=checkout,
        )
        return HeldRoomsOut(held_room_type_ids=ids)

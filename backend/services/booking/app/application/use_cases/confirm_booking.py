from uuid import UUID
from datetime import datetime

from app.application.exceptions import BookingNotFoundError
from app.application.ports.outbound.booking_repository import BookingRepository
from app.domain.models import BookingStatus
from app.schemas.booking import BookingDetailOut

class InventoryConflictError(Exception):
    pass

class ConfirmBookingUseCase:
    def __init__(self, repo: BookingRepository):
        self._repo = repo

    async def execute(self, booking_id: UUID, user_id: UUID, notes: str | None = None) -> BookingDetailOut:
        # 1. Obtener la reserva y validar permisos
        booking = await self._repo.get_by_id_for_user(booking_id, user_id)
        if booking is None:
            raise BookingNotFoundError()
        if booking.status != BookingStatus.PENDING_CONFIRMATION:
            raise ValueError("La reserva no está pendiente de confirmación.")

        # 2. Validar inventario (simulado, implementar lógica real)
        if not await self._repo.check_inventory(booking):
            raise InventoryConflictError("No hay disponibilidad suficiente para confirmar la reserva.")

        # 3. Confirmar reserva
        booking.status = BookingStatus.CONFIRMED
        booking.updated_at = datetime.utcnow()
        await self._repo.update(booking)
        await self._repo.decrement_inventory(booking)
        # TODO: Enviar email de confirmación
        return BookingDetailOut.model_validate(booking)

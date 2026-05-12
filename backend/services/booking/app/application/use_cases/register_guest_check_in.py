"""Hotel partner records physical check-in for a confirmed booking on or after stay date.

Idempotencia: si la reserva ya está en CHECKED_IN, ``execute`` devuelve el detalle actual sin
volver a escribir historial ni actualizar filas (un POST repetido es aceptado como no-op).
Las validaciones de ``actual_arrival_at`` solo aplican en la transición CONFIRMED → CHECKED_IN.
"""

from datetime import UTC, date, datetime
from uuid import UUID

from app.application.exceptions import BookingNotFoundError, InvalidBookingStateError
from app.application.ports.outbound.booking_repository import BookingRepository
from app.application.ports.outbound.guest_repository import GuestRepository
from app.application.use_cases.get_booking_detail import GetBookingDetailUseCase
from app.domain.models import BookingStatus, new_status_history_row
from app.schemas.booking import BookingDetailOut


def _to_naive_utc(dt: datetime) -> datetime:
    if dt.tzinfo is not None:
        return dt.astimezone(UTC).replace(tzinfo=None)
    return dt


class RegisterGuestCheckInUseCase:
    def __init__(self, booking_repo: BookingRepository, guest_repo: GuestRepository):
        self._booking_repo = booking_repo
        self._guest_repo = guest_repo

    async def execute(
        self,
        *,
        booking_id: UUID,
        hotel_id: UUID | None,
        actor_user_id: UUID,
        actual_arrival_at: datetime,
        today: date | None = None,
    ) -> BookingDetailOut:
        # hotel_id=None means an ADMIN is acting on behalf of the hotel: skip the
        # ownership scope check but still apply the same state-machine rules.
        today_eff = today if today is not None else datetime.now(UTC).date()

        if hotel_id is None:
            booking = await self._booking_repo.get_by_id(booking_id)
            viewer_role = "ADMIN"
        else:
            booking = await self._booking_repo.get_by_id_for_hotel(booking_id, hotel_id)
            viewer_role = "HOTEL"
        if booking is None:
            raise BookingNotFoundError()

        detail_uc = GetBookingDetailUseCase(self._booking_repo, self._guest_repo)

        if booking.status == BookingStatus.CHECKED_IN:
            return await detail_uc.execute(
                booking_id,
                actor_user_id,
                viewer_role=viewer_role,
                hotel_id=hotel_id,
                today=today_eff,
            )

        if booking.status != BookingStatus.CONFIRMED:
            raise InvalidBookingStateError(
                "Solo se puede registrar check-in en reservas confirmadas."
            )

        if booking.checkin > today_eff:
            raise InvalidBookingStateError(
                "La fecha programada de check-in aún no ha llegado para esta reserva."
            )

        arrival = _to_naive_utc(actual_arrival_at)
        now_naive = datetime.now(UTC).replace(tzinfo=None)
        if arrival > now_naive:
            raise InvalidBookingStateError(
                "La hora de llegada no puede ser posterior al momento actual del servidor."
            )
        if arrival.date() < booking.checkin:
            raise InvalidBookingStateError(
                "La hora de llegada no puede corresponder a un día anterior al check-in programado."
            )

        booking.status = BookingStatus.CHECKED_IN
        booking.actual_checkin_at = arrival
        booking.updated_at = now_naive
        await self._booking_repo.update(booking)
        await self._booking_repo.add_status_history(
            new_status_history_row(
                booking.id,
                from_status=BookingStatus.CONFIRMED,
                to_status=BookingStatus.CHECKED_IN,
                reason="hotel_check_in",
                changed_by=actor_user_id,
            )
        )

        return await detail_uc.execute(
            booking_id,
            actor_user_id,
            viewer_role=viewer_role,
            hotel_id=hotel_id,
            today=today_eff,
        )

"""Hotel partner records physical check-out for a checked-in booking on or after scheduled checkout day.

Idempotencia: si la reserva ya está en ``CHECKED_OUT``, ``execute`` devuelve el detalle actual sin
volver a escribir historial ni modificar ``actual_checkout_at`` (un POST repetido es no-op).
Las validaciones de ``actual_departure_at`` solo aplican en la transición ``CHECKED_IN`` → ``CHECKED_OUT``.
"""

from collections.abc import Callable
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


def _default_now_utc() -> datetime:
    return datetime.now(UTC)


class RegisterGuestCheckOutUseCase:
    def __init__(
        self,
        booking_repo: BookingRepository,
        guest_repo: GuestRepository,
        clock: Callable[[], datetime] | None = None,
    ):
        self._booking_repo = booking_repo
        self._guest_repo = guest_repo
        self._clock = clock or _default_now_utc

    async def execute(
        self,
        *,
        booking_id: UUID,
        hotel_id: UUID,
        actor_user_id: UUID,
        actual_departure_at: datetime,
        today: date | None = None,
    ) -> BookingDetailOut:
        today_eff = today if today is not None else datetime.now(UTC).date()

        booking = await self._booking_repo.get_by_id_for_hotel(booking_id, hotel_id)
        if booking is None:
            raise BookingNotFoundError()

        detail_uc = GetBookingDetailUseCase(self._booking_repo, self._guest_repo)

        if booking.status == BookingStatus.CHECKED_OUT:
            return await detail_uc.execute(
                booking_id,
                actor_user_id,
                viewer_role="HOTEL",
                hotel_id=hotel_id,
                today=today_eff,
            )

        if booking.status != BookingStatus.CHECKED_IN:
            raise InvalidBookingStateError(
                "Solo se puede registrar check-out en reservas con check-in ya registrado."
            )

        if booking.actual_checkin_at is None:
            raise InvalidBookingStateError(
                "No se puede registrar check-out sin una hora de check-in registrada."
            )

        if booking.checkout > today_eff:
            raise InvalidBookingStateError(
                "La fecha programada de check-out aún no ha llegado para esta reserva."
            )

        departure = _to_naive_utc(actual_departure_at)
        now_wall = self._clock()
        if now_wall.tzinfo is not None:
            now_naive = now_wall.astimezone(UTC).replace(tzinfo=None)
        else:
            now_naive = now_wall
        if departure > now_naive:
            raise InvalidBookingStateError(
                "La hora de salida no puede ser posterior al momento actual del servidor."
            )

        checkin_at = booking.actual_checkin_at
        if departure < checkin_at:
            raise InvalidBookingStateError(
                "La hora de salida no puede ser anterior al check-in real registrado."
            )

        if departure.date() < booking.checkout:
            raise InvalidBookingStateError(
                "La salida no puede ser anterior al día de check-out programado (no hay regla de early check-out)."
            )

        booking.status = BookingStatus.CHECKED_OUT
        booking.actual_checkout_at = departure
        booking.updated_at = now_naive
        await self._booking_repo.update(booking)
        await self._booking_repo.add_status_history(
            new_status_history_row(
                booking.id,
                from_status=BookingStatus.CHECKED_IN,
                to_status=BookingStatus.CHECKED_OUT,
                reason="hotel_check_out",
                changed_by=actor_user_id,
            )
        )

        return await detail_uc.execute(
            booking_id,
            actor_user_id,
            viewer_role="HOTEL",
            hotel_id=hotel_id,
            today=today_eff,
        )

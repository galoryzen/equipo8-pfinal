from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import String, and_, case, exists, func as sa_func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.ports.outbound.booking_repository import BookingRepository
from app.domain.models import Booking, BookingScope, BookingStatus, BookingStatusHistory, Guest


def _escape_ilike_pattern(fragment: str) -> str:
    """Wildcard-safe ILIKE pattern (Escape ``\\\\``)."""
    escaped = fragment.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"

_ACTIVE_STATUSES = (
    BookingStatus.CONFIRMED,
    BookingStatus.CHECKED_IN,
    BookingStatus.PENDING_PAYMENT,
    BookingStatus.PENDING_CONFIRMATION,
)
_PAST_TERMINAL_STATUSES = (BookingStatus.CANCELLED, BookingStatus.REJECTED)
# Trip listings hide CART (use GET /bookings/my-cart for in-progress rescue) and
# EXPIRED (terminal-but-not-meaningful holds the user never paid for).
_EXCLUDED_FROM_ALL = (BookingStatus.CART, BookingStatus.EXPIRED)

class SqlAlchemyBookingRepository(BookingRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def list_by_user_id(
        self,
        user_id: UUID,
        *,
        scope: BookingScope = BookingScope.ALL,
        status: str | None = None,
        today: date | None = None,
        page: int = 1,
        page_size: int = 10,
    ) -> tuple[list[Booking], int]:
        today = today or datetime.now(UTC).date()
        base_where = [Booking.user_id == user_id]

        if status:
            base_where += [Booking.status == status]
            order = Booking.checkin.desc()
        elif scope is BookingScope.ACTIVE:
            base_where += [Booking.status.in_(_ACTIVE_STATUSES), Booking.checkout >= today]
            order = Booking.checkin.asc()
        elif scope is BookingScope.PAST:
            base_where += [
                or_(
                    and_(
                        Booking.status.in_((BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN)),
                        Booking.checkout < today,
                    ),
                    Booking.status.in_(_PAST_TERMINAL_STATUSES),
                    Booking.status == BookingStatus.CHECKED_OUT,
                )
            ]
            order = Booking.checkout.desc()
        else:
            base_where += [Booking.status.not_in(_EXCLUDED_FROM_ALL)]
            order = Booking.checkin.desc()

        count_stmt = select(sa_func.count(Booking.id)).where(*base_where)
        total: int = (await self._session.execute(count_stmt)).scalar() or 0

        stmt = (
            select(Booking)
            .where(*base_where)
            .order_by(order)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all()), total

    async def get_by_id(self, booking_id: UUID) -> Booking | None:
        stmt = select(Booking).where(Booking.id == booking_id)
        result = await self._session.execute(stmt)
        return result.scalars().one_or_none()

    async def list_all(
        self, status: str | None = None, page: int = 1, page_size: int = 10
    ) -> tuple[list[Booking], int]:
        conditions = []
        if status:
            conditions.append(Booking.status == status)

        count_stmt = select(sa_func.count(Booking.id))
        if conditions:
            count_stmt = count_stmt.where(*conditions)
        total: int = (await self._session.execute(count_stmt)).scalar() or 0

        stmt = select(Booking)
        if conditions:
            stmt = stmt.where(*conditions)
        stmt = stmt.order_by(Booking.checkin.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await self._session.execute(stmt)
        return list(result.scalars().all()), total

    async def list_by_hotel(
        self,
        hotel_id: UUID,
        *,
        status: str | BookingStatus | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        room_type_id: UUID | None = None,
        q: str | None = None,
        page: int = 1,
        page_size: int | None = 10,
    ) -> tuple[list[Booking], int]:
        hotel_filter = text(
            "booking.booking.property_id IN "
            "(SELECT p.id FROM catalog.property p WHERE p.hotel_id = :hotel_id)"
        )
        bind = {"hotel_id": str(hotel_id)}
        conditions: list = [hotel_filter]

        if status is not None:
            conditions.append(Booking.status == status)
        if date_from is not None:
            conditions.append(Booking.checkout >= date_from)
        if date_to is not None:
            conditions.append(Booking.checkin <= date_to)
        if room_type_id is not None:
            conditions.append(Booking.room_type_id == room_type_id)

        q_trim = (q or "").strip()
        if q_trim:
            pat = _escape_ilike_pattern(q_trim)
            guest_pred = or_(
                Guest.full_name.ilike(pat, escape="\\"),
                and_(Guest.email.isnot(None), Guest.email.ilike(pat, escape="\\")),
            )
            guest_exists = exists(
                select(1).select_from(Guest).where(Guest.booking_id == Booking.id, guest_pred)
            )
            id_text = Booking.id.cast(String)
            hex_compact = sa_func.replace(id_text, "-", "")
            id_search = or_(
                guest_exists,
                id_text.ilike(pat, escape="\\"),
                hex_compact.ilike(pat, escape="\\"),
            )
            ref_core = q_trim.lstrip("#").strip().upper()
            if ref_core:
                ref_pat = _escape_ilike_pattern(ref_core)
                suffix = sa_func.upper(sa_func.right(hex_compact, 8))
                id_search = or_(id_search, suffix.ilike(ref_pat, escape="\\"))
            conditions.append(id_search)

        count_stmt = select(sa_func.count(Booking.id)).where(*conditions).params(**bind)
        total: int = (await self._session.execute(count_stmt)).scalar() or 0

        stmt = select(Booking).where(*conditions).params(**bind).order_by(Booking.checkin.desc())
        if page_size is not None:
            stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        result = await self._session.execute(stmt)
        return list(result.scalars().all()), total

    async def count_hotel_bookings_metrics(self, hotel_id: UUID, *, today: date) -> dict[str, int]:
        hotel_filter = text(
            "booking.booking.property_id IN "
            "(SELECT p.id FROM catalog.property p WHERE p.hotel_id = :hotel_id)"
        )
        excluded_checkin = (
            BookingStatus.CANCELLED,
            BookingStatus.REJECTED,
            BookingStatus.EXPIRED,
            BookingStatus.CART,
        )
        stmt = (
            select(
                sa_func.coalesce(
                    sa_func.sum(case((Booking.status == BookingStatus.CONFIRMED, 1), else_=0)),
                    0,
                ),
                sa_func.coalesce(
                    sa_func.sum(
                        case(
                            (
                                Booking.status.in_(
                                    (BookingStatus.PENDING_CONFIRMATION, BookingStatus.PENDING_PAYMENT)
                                ),
                                1,
                            ),
                            else_=0,
                        )
                    ),
                    0,
                ),
                sa_func.coalesce(
                    sa_func.sum(
                        case(
                            (
                                and_(
                                    Booking.checkin == today,
                                    Booking.status != BookingStatus.CHECKED_OUT,
                                    Booking.status.not_in(excluded_checkin),
                                ),
                                1,
                            ),
                            else_=0,
                        )
                    ),
                    0,
                ),
                sa_func.coalesce(
                    sa_func.sum(case((Booking.status == BookingStatus.CANCELLED, 1), else_=0)),
                    0,
                ),
            )
            .select_from(Booking)
            .where(hotel_filter)
            .params(hotel_id=str(hotel_id))
        )
        row = (await self._session.execute(stmt)).one()
        return {
            "confirmed_count": int(row[0]),
            "pending_count": int(row[1]),
            "check_ins_today_count": int(row[2]),
            "cancelled_count": int(row[3]),
        }

    async def get_by_id_for_user(self, booking_id: UUID, user_id: UUID) -> Booking | None:
        stmt = select(Booking).where(Booking.id == booking_id, Booking.user_id == user_id)
        result = await self._session.execute(stmt)
        return result.scalars().one_or_none()

    async def get_by_id_for_hotel(self, booking_id: UUID, hotel_id: UUID) -> Booking | None:
        hotel_filter = text(
            "booking.booking.property_id IN "
            "(SELECT p.id FROM catalog.property p WHERE p.hotel_id = :hotel_id)"
        )
        stmt = (
            select(Booking)
            .where(Booking.id == booking_id)
            .where(hotel_filter)
            .params(hotel_id=str(hotel_id))
        )
        result = await self._session.execute(stmt)
        return result.scalars().one_or_none()

    async def create(self, booking: Booking) -> Booking:
        self._session.add(booking)
        await self._session.commit()
        await self._session.refresh(booking)
        return booking

    async def save(self, booking: Booking) -> None:
        await self._session.merge(booking)
        await self._session.commit()

    async def update(self, booking: Booking) -> None:
        self._session.add(booking)
        await self._session.commit()

    async def check_inventory(self, booking: Booking) -> bool:
        return True

    async def decrement_inventory(self, booking: Booking) -> None:
        pass

    async def find_active_cart(
        self,
        user_id: UUID,
        room_type_id: UUID,
        rate_plan_id: UUID,
        checkin: date,
        checkout: date,
    ) -> Booking | None:
        now = datetime.now(UTC).replace(tzinfo=None)  # naive UTC — column is TIMESTAMP WITHOUT TIME ZONE
        stmt = (
            select(Booking)
            .where(
                Booking.user_id == user_id,
                Booking.status == BookingStatus.CART,
                Booking.hold_expires_at > now,
                Booking.checkin == checkin,
                Booking.checkout == checkout,
                Booking.room_type_id == room_type_id,
                Booking.rate_plan_id == rate_plan_id,
            )
            .limit(1)
        )
        result = await self._session.execute(stmt)
        return result.scalars().one_or_none()

    async def find_any_active_cart_for_user(self, user_id: UUID) -> Booking | None:
        now = datetime.now(UTC).replace(tzinfo=None)
        stmt = (
            select(Booking)
            .where(
                Booking.user_id == user_id,
                Booking.status == BookingStatus.CART,
                Booking.hold_expires_at > now,
            )
            .limit(1)
        )
        result = await self._session.execute(stmt)
        return result.scalars().one_or_none()

    async def find_expired_unpaid_bookings(self, now: datetime) -> list[Booking]:
        stmt = select(Booking).where(
            Booking.status.in_((BookingStatus.CART, BookingStatus.PENDING_PAYMENT)),
            Booking.hold_expires_at.is_not(None),
            Booking.hold_expires_at < now,
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def find_unreleased_terminal_bookings(self) -> list[Booking]:
        stmt = select(Booking).where(
            Booking.status.in_(
                (BookingStatus.CANCELLED, BookingStatus.EXPIRED, BookingStatus.REJECTED)
            ),
            Booking.inventory_released.is_(False),
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def add_status_history(self, row: BookingStatusHistory) -> None:
        self._session.add(row)
        await self._session.commit()

    async def save_and_record_status_history(
        self, booking: Booking, row: BookingStatusHistory
    ) -> None:
        await self._session.merge(booking)
        self._session.add(row)
        await self._session.commit()

    async def find_last_status_history_by_reason(
        self, booking_id: UUID, reason: str
    ) -> BookingStatusHistory | None:
        stmt = (
            select(BookingStatusHistory)
            .where(
                BookingStatusHistory.booking_id == booking_id,
                BookingStatusHistory.reason == reason,
            )
            .order_by(BookingStatusHistory.changed_at.desc())
            .limit(1)
        )
        result = await self._session.execute(stmt)
        return result.scalars().one_or_none()

    async def find_last_status_history_by_reason_prefix(
        self, booking_id: UUID, reason_prefix: str
    ) -> BookingStatusHistory | None:
        stmt = (
            select(BookingStatusHistory)
            .where(
                BookingStatusHistory.booking_id == booking_id,
                BookingStatusHistory.reason.like(f"{reason_prefix}%"),
            )
            .order_by(BookingStatusHistory.changed_at.desc())
            .limit(1)
        )
        result = await self._session.execute(stmt)
        return result.scalars().one_or_none()

    async def get_property_stats(self, property_id: UUID) -> dict:
        today = datetime.now(UTC).date()
        now = datetime.now(UTC).replace(tzinfo=None)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        active_stmt = select(sa_func.count(Booking.id)).where(
            Booking.property_id == property_id,
            Booking.status.in_((BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN)),
            Booking.checkout >= today,
        )
        active_result = await self._session.execute(active_stmt)
        active_bookings = active_result.scalar() or 0

        revenue_stmt = select(sa_func.coalesce(sa_func.sum(Booking.total_amount), Decimal("0"))).where(
            Booking.property_id == property_id,
            Booking.status.in_((BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN)),
            Booking.created_at >= month_start,
        )
        revenue_result = await self._session.execute(revenue_stmt)
        monthly_revenue = float(revenue_result.scalar() or 0)

        return {"active_bookings": active_bookings, "monthly_revenue": monthly_revenue}

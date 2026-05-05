from fastapi import APIRouter, Depends
from uuid import UUID

from app.schemas.refund import RefundOut
from app.application.use_cases.get_refund_by_booking import GetRefundByBookingUseCase
from app.adapters.inbound.api.dependencies import get_refund_by_booking_use_case

router = APIRouter(tags=["refunds"])


@router.get("/by-booking/{booking_id}", response_model=RefundOut | None)
async def get_refund_by_booking(
    booking_id: UUID,
    use_case: GetRefundByBookingUseCase = Depends(get_refund_by_booking_use_case),
):
    refund = await use_case.execute(booking_id)
    if not refund:
        return None
    return RefundOut(
        amount=str(refund.amount),
        status=refund.status,
        reason=refund.reason,
        created_at=refund.created_at,
    )

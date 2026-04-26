import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.application.exceptions import (
    BookingNotFoundError,
    CatalogUnavailableError,
    CheckoutGuestsIncompleteError,
    ConflictingActiveCartError,
    GuestsCountMismatchError,
    InvalidBookingStateError,
    InvalidTokenError,
    InventoryUnavailableError,
    PrimaryGuestMissingContactError,
    PrimaryGuestRequiredError,
    RateCurrencyMismatchError,
    RatePlanNotFoundError,
    RateUnavailableError,
)

logger = logging.getLogger(__name__)


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(InvalidTokenError)
    async def invalid_token_handler(request: Request, exc: InvalidTokenError):
        return JSONResponse(
            status_code=401,
            content={
                "code": "INVALID_TOKEN",
                "message": str(exc),
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(BookingNotFoundError)
    async def booking_not_found_handler(request: Request, exc: BookingNotFoundError):
        return JSONResponse(
            status_code=404,
            content={
                "code": "BOOKING_NOT_FOUND",
                "message": "Booking not found",
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(InvalidBookingStateError)
    async def invalid_booking_state_handler(request: Request, exc: InvalidBookingStateError):
        return JSONResponse(
            status_code=409,
            content={
                "code": "INVALID_BOOKING_STATE",
                "message": str(exc) or "Operation not allowed in current booking state",
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(InventoryUnavailableError)
    async def inventory_unavailable_handler(request: Request, exc: InventoryUnavailableError):
        return JSONResponse(
            status_code=409,
            content={
                "code": "INVENTORY_UNAVAILABLE",
                "message": "Room is no longer available for the selected dates",
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(ConflictingActiveCartError)
    async def conflicting_active_cart_handler(request: Request, exc: ConflictingActiveCartError):
        return JSONResponse(
            status_code=409,
            content={
                "code": "CART_ALREADY_EXISTS",
                "message": "You already have a reservation in progress",
                "existing_booking_id": str(exc.existing_booking_id),
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(GuestsCountMismatchError)
    async def guests_count_mismatch_handler(request: Request, exc: GuestsCountMismatchError):
        return JSONResponse(
            status_code=422,
            content={
                "code": "GUESTS_COUNT_MISMATCH",
                "message": str(exc),
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(PrimaryGuestRequiredError)
    async def primary_guest_required_handler(request: Request, exc: PrimaryGuestRequiredError):
        return JSONResponse(
            status_code=422,
            content={
                "code": "PRIMARY_GUEST_REQUIRED",
                "message": str(exc),
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(PrimaryGuestMissingContactError)
    async def primary_guest_missing_contact_handler(
        request: Request, exc: PrimaryGuestMissingContactError
    ):
        return JSONResponse(
            status_code=422,
            content={
                "code": "PRIMARY_GUEST_MISSING_CONTACT",
                "message": str(exc),
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(CheckoutGuestsIncompleteError)
    async def checkout_guests_incomplete_handler(
        request: Request, exc: CheckoutGuestsIncompleteError
    ):
        return JSONResponse(
            status_code=422,
            content={
                "code": "CHECKOUT_GUESTS_INCOMPLETE",
                "message": str(exc),
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(CatalogUnavailableError)
    async def catalog_unavailable_handler(request: Request, exc: CatalogUnavailableError):
        return JSONResponse(
            status_code=503,
            content={
                "code": "CATALOG_UNAVAILABLE",
                "message": "Inventory service is temporarily unavailable. Please try again.",
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(RatePlanNotFoundError)
    async def rate_plan_not_found_handler(request: Request, exc: RatePlanNotFoundError):
        return JSONResponse(
            status_code=404,
            content={
                "code": "RATE_PLAN_NOT_FOUND",
                "message": "Rate plan not found",
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(RateUnavailableError)
    async def rate_unavailable_handler(request: Request, exc: RateUnavailableError):
        return JSONResponse(
            status_code=409,
            content={
                "code": "RATE_UNAVAILABLE",
                "message": "Rates are not available for the selected dates. Please pick different dates.",
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(RateCurrencyMismatchError)
    async def rate_currency_mismatch_handler(request: Request, exc: RateCurrencyMismatchError):
        return JSONResponse(
            status_code=422,
            content={
                "code": "RATE_CURRENCY_MISMATCH",
                "message": "Currency does not match the rate plan",
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception):
        logger.exception("Unhandled error")
        return JSONResponse(
            status_code=500,
            content={
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "trace_id": request.headers.get("x-request-id"),
            },
        )

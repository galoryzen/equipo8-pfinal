from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.application.exceptions import (
    BookingNotFoundError,
    BookingNotPayableError,
    BookingSnapshotError,
    InvalidMockPaymentTokenError,
    InvalidTokenError,
    PaymentAlreadyTerminalError,
    PaymentIntentNotFoundError,
    PaymentNotAllowedError,
    WebhookAuthError,
    WebhookIdempotentReplayError,
)


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

    @app.exception_handler(BookingSnapshotError)
    async def booking_snapshot_handler(request: Request, exc: BookingSnapshotError):
        return JSONResponse(
            status_code=503,
            content={
                "code": "BOOKING_UNAVAILABLE",
                "message": str(exc),
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(BookingNotPayableError)
    async def booking_not_payable_handler(request: Request, exc: BookingNotPayableError):
        return JSONResponse(
            status_code=409,
            content={
                "code": "BOOKING_NOT_PAYABLE",
                "message": str(exc),
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(PaymentIntentNotFoundError)
    async def intent_not_found_handler(request: Request, exc: PaymentIntentNotFoundError):
        return JSONResponse(
            status_code=404,
            content={
                "code": "PAYMENT_INTENT_NOT_FOUND",
                "message": "Payment intent not found",
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(PaymentNotAllowedError)
    async def not_allowed_handler(request: Request, exc: PaymentNotAllowedError):
        return JSONResponse(
            status_code=403,
            content={
                "code": "PAYMENT_NOT_ALLOWED",
                "message": str(exc),
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(InvalidMockPaymentTokenError)
    async def invalid_token_mock_handler(request: Request, exc: InvalidMockPaymentTokenError):
        return JSONResponse(
            status_code=422,
            content={
                "code": "INVALID_PAYMENT_TOKEN",
                "message": str(exc),
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(PaymentAlreadyTerminalError)
    async def already_terminal_handler(request: Request, exc: PaymentAlreadyTerminalError):
        return JSONResponse(
            status_code=409,
            content={
                "code": "PAYMENT_INTENT_TERMINAL",
                "message": str(exc),
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(WebhookAuthError)
    async def webhook_auth_handler(request: Request, exc: WebhookAuthError):
        return JSONResponse(
            status_code=401,
            content={
                "code": "WEBHOOK_UNAUTHORIZED",
                "message": "Invalid webhook credentials",
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(WebhookIdempotentReplayError)
    async def webhook_replay_handler(request: Request, exc: WebhookIdempotentReplayError):
        return JSONResponse(
            status_code=200,
            content={
                "code": "WEBHOOK_DUPLICATE",
                "message": "Already processed (idempotent replay)",
                "trace_id": request.headers.get("x-request-id"),
            },
        )

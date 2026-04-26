import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.application.exceptions import (
    InsufficientInventoryError,
    PromotionError,
    PropertyNotFoundError,
    RateCurrencyMismatchError,
    RatePlanNotFoundError,
    RateUnavailableError,
    UnauthorizedError,
)

logger = logging.getLogger(__name__)


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(PropertyNotFoundError)
    async def property_not_found_handler(request: Request, exc: PropertyNotFoundError):
        return JSONResponse(
            status_code=404,
            content={
                "code": "PROPERTY_NOT_FOUND",
                "message": str(exc),
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(InsufficientInventoryError)
    async def insufficient_inventory_handler(request: Request, exc: InsufficientInventoryError):
        return JSONResponse(
            status_code=409,
            content={
                "code": "INSUFFICIENT_INVENTORY",
                "message": str(exc),
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(UnauthorizedError)
    async def unauthorized_handler(request: Request, exc: UnauthorizedError):
        return JSONResponse(
            status_code=401,
            content={
                "code": "UNAUTHORIZED",
                "message": str(exc),
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(PromotionError)
    async def promotion_error_handler(request: Request, exc: PromotionError):
        return JSONResponse(
            status_code=422,
            content={
                "code": "PROMOTION_ERROR",
                "message": str(exc),
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(RatePlanNotFoundError)
    async def rate_plan_not_found_handler(request: Request, exc: RatePlanNotFoundError):
        return JSONResponse(
            status_code=404,
            content={
                "code": "RATE_PLAN_NOT_FOUND",
                "message": str(exc),
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(RateUnavailableError)
    async def rate_unavailable_handler(request: Request, exc: RateUnavailableError):
        return JSONResponse(
            status_code=409,
            content={
                "code": "RATE_UNAVAILABLE",
                "message": str(exc),
                "missing_days": [d.isoformat() for d in exc.missing_days],
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(RateCurrencyMismatchError)
    async def rate_currency_mismatch_handler(request: Request, exc: RateCurrencyMismatchError):
        return JSONResponse(
            status_code=422,
            content={
                "code": "RATE_CURRENCY_MISMATCH",
                "message": str(exc),
                "currencies": exc.currencies,
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

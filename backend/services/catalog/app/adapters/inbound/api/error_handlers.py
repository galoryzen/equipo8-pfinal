import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.application.exceptions import InsufficientInventoryError, PropertyNotFoundError

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

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.application.exceptions import (
    EmailAlreadyExistsError,
    InvalidCredentialsError,
    InvalidTokenError,
)

logger = logging.getLogger(__name__)


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(InvalidCredentialsError)
    async def invalid_credentials_handler(request: Request, exc: InvalidCredentialsError):
        return JSONResponse(
            status_code=401,
            content={
                "code": "INVALID_CREDENTIALS",
                "message": str(exc),
                "trace_id": request.headers.get("x-request-id"),
            },
        )

    @app.exception_handler(EmailAlreadyExistsError)
    async def email_already_exists_handler(request: Request, exc: EmailAlreadyExistsError):
        return JSONResponse(
            status_code=409,
            content={
                "code": "EMAIL_ALREADY_EXISTS",
                "message": str(exc),
                "trace_id": request.headers.get("x-request-id"),
            },
        )

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

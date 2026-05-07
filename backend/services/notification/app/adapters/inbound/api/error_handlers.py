from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.application.exceptions import InvalidTokenError, NoActiveTokensError


def _error_body(code: str, message: str) -> dict:
    return {"code": code, "message": message}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(InvalidTokenError)
    async def _invalid_token(_: Request, exc: InvalidTokenError) -> JSONResponse:
        return JSONResponse(status_code=401, content=_error_body("INVALID_TOKEN", str(exc)))

    @app.exception_handler(NoActiveTokensError)
    async def _no_active_tokens(_: Request, exc: NoActiveTokensError) -> JSONResponse:
        return JSONResponse(status_code=404, content=_error_body("NO_ACTIVE_TOKENS", str(exc)))

"""Dependency for protecting internal service-to-service endpoints.

Used by routers mounted under `/internal/` (not exposed via nginx/ALB).
Expects `X-Internal-Token` header matching the shared `INTERNAL_SERVICE_TOKEN`
set on every participating service.
"""

from collections.abc import Callable

from fastapi import Header, HTTPException, status


def require_internal_token(get_expected: Callable[[], str] | str):
    """Build a FastAPI dependency that rejects requests missing a valid header.

    `get_expected` can be either a string or a callable — a callable is
    evaluated on each request so services can pass `lambda: settings.INTERNAL_SERVICE_TOKEN`
    and test code can rebind the setting without restarting the app.

    A missing or empty expected token means the service has not been configured;
    in that case we fail closed (503), so a misconfigured deployment does not
    silently expose internal routes.
    """

    async def _dep(x_internal_token: str | None = Header(default=None)) -> None:
        expected = get_expected() if callable(get_expected) else get_expected
        if not expected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="internal token not configured",
            )
        if x_internal_token != expected:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="invalid internal token",
            )

    return _dep

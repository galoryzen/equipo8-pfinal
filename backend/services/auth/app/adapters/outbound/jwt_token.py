from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.application.ports.outbound.token_port import TokenPort
from app.config import settings


class JwtTokenAdapter(TokenPort):
    def create_access_token(self, subject: str, email: str, role: str, hotel_id: str | None = None) -> str:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
        payload: dict = {
            "sub": subject,
            "email": email,
            "role": role,
            "exp": expire,
        }
        if hotel_id is not None:
            payload["hotel_id"] = hotel_id
        return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    def decode_access_token(self, token: str) -> dict | None:
        try:
            return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        except JWTError:
            return None

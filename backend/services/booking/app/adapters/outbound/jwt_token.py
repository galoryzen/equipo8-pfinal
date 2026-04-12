from jose import JWTError, jwt

from app.application.ports.outbound.token_port import TokenPort
from app.config import settings


class JwtTokenAdapter(TokenPort):
    def decode_access_token(self, token: str) -> dict | None:
        try:
            return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        except JWTError:
            return None
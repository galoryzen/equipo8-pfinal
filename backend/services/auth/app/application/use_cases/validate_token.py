from app.application.exceptions import InvalidTokenError
from app.application.ports.outbound.token_port import TokenPort


class ValidateTokenUseCase:
    def __init__(self, token: TokenPort):
        self._token = token

    def execute(self, access_token: str) -> dict:
        payload = self._token.decode_access_token(access_token)
        if payload is None:
            raise InvalidTokenError()

        return {
            "id": payload["sub"],
            "email": payload["email"],
            "role": payload["role"],
            "full_name": payload.get("full_name"),
        }

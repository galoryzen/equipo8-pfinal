import bcrypt

from app.application.exceptions import InvalidCredentialsError
from app.application.ports.outbound.token_port import TokenPort
from app.application.ports.outbound.user_repository import UserRepository
from app.domain.models import UserRole


class LoginUserUseCase:
    def __init__(self, repo: UserRepository, token: TokenPort, allowed_roles=None):
        self._repo = repo
        self._token = token
        # Si no se especifica, permite todos los roles
        self._allowed_roles = allowed_roles

    async def execute(self, email: str, password: str) -> dict:
        user = await self._repo.get_by_email(email)
        if user is None:
            raise InvalidCredentialsError()

        if not bcrypt.checkpw(password.encode("utf-8"), user.password):
            raise InvalidCredentialsError()

        # Permitir filtrar roles válidos si se especifica
        if self._allowed_roles is not None and user.role not in self._allowed_roles:
            raise InvalidCredentialsError()

        hotel_id: str | None = None
        # Validar usuario activo según rol solo si aplica
        if user.role == UserRole.HOTEL:
            hid = await self._repo.get_hotel_id_by_user_id(user.id)
            if hid is None:
                raise InvalidCredentialsError()
            hotel_id = str(hid)
        elif user.role == UserRole.AGENCY:
            agency_id = await self._repo.get_agency_id_by_user_id(user.id)
            if agency_id is None:
                raise InvalidCredentialsError()
            agency_id = str(agency_id)
        # ADMIN y TRAVELER solo requieren credenciales válidas

        access_token = self._token.create_access_token(
            subject=str(user.id),
            email=user.email,
            role=user.role.value,
            hotel_id=hotel_id,
        )

        return {
            "id": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "token": access_token,
        }

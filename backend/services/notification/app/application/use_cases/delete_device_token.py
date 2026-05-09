from app.application.ports.outbound.device_token_repository import DeviceTokenRepository


class DeleteDeviceTokenUseCase:
    def __init__(self, repo: DeviceTokenRepository):
        self._repo = repo

    async def execute(self, *, token: str) -> None:
        await self._repo.deactivate_by_token(token)

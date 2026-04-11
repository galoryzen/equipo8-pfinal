import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import bcrypt
import pytest

from app.application.exceptions import (
    EmailAlreadyExistsError,
    InvalidCredentialsError,
    InvalidTokenError,
)
from app.application.ports.outbound.token_port import TokenPort
from app.application.ports.outbound.user_repository import UserRepository
from app.application.use_cases.login_user import LoginUserUseCase
from app.application.use_cases.register_user import RegisterUserUseCase
from app.application.use_cases.validate_token import ValidateTokenUseCase
from app.domain.models import User, UserRole


@pytest.fixture
def mock_repo():
    return AsyncMock(spec=UserRepository)


@pytest.fixture
def mock_token():
    token = MagicMock(spec=TokenPort)
    token.create_access_token.return_value = "generated-jwt-token"
    token.decode_access_token.return_value = {
        "sub": "user-id",
        "email": "user@example.com",
        "role": "TRAVELER",
    }
    return token


@pytest.fixture
def sample_user():
    now = datetime.now(timezone.utc)
    return User(
        id=uuid.uuid4(),
        email="user@example.com",
        full_name="Test User",
        phone="+1234567890",
        country_code="US",
        role=UserRole.TRAVELER,
        password=bcrypt.hashpw(b"secret123", bcrypt.gensalt()),
        created_at=now,
        updated_at=now,
    )


class TestLoginUserUseCase:
    async def test_returns_user_data_and_token(self, mock_repo, mock_token, sample_user):
        mock_repo.get_by_email.return_value = sample_user
        uc = LoginUserUseCase(mock_repo, mock_token)

        result = await uc.execute("user@example.com", "secret123")

        assert result["id"] == str(sample_user.id)
        assert result["email"] == "user@example.com"
        assert result["role"] == "TRAVELER"
        assert result["token"] == "generated-jwt-token"

    async def test_calls_repo_with_email(self, mock_repo, mock_token, sample_user):
        mock_repo.get_by_email.return_value = sample_user
        uc = LoginUserUseCase(mock_repo, mock_token)

        await uc.execute("user@example.com", "secret123")

        mock_repo.get_by_email.assert_awaited_once_with("user@example.com")

    async def test_creates_token_with_user_data(self, mock_repo, mock_token, sample_user):
        mock_repo.get_by_email.return_value = sample_user
        uc = LoginUserUseCase(mock_repo, mock_token)

        await uc.execute("user@example.com", "secret123")

        mock_token.create_access_token.assert_called_once_with(
            subject=str(sample_user.id),
            email="user@example.com",
            role="TRAVELER",
        )

    async def test_raises_when_user_not_found(self, mock_repo, mock_token):
        mock_repo.get_by_email.return_value = None
        uc = LoginUserUseCase(mock_repo, mock_token)

        with pytest.raises(InvalidCredentialsError):
            await uc.execute("ghost@example.com", "whatever")

    async def test_raises_when_password_wrong(self, mock_repo, mock_token, sample_user):
        mock_repo.get_by_email.return_value = sample_user
        uc = LoginUserUseCase(mock_repo, mock_token)

        with pytest.raises(InvalidCredentialsError):
            await uc.execute("user@example.com", "wrong-password")

    async def test_does_not_create_token_on_bad_credentials(self, mock_repo, mock_token):
        mock_repo.get_by_email.return_value = None
        uc = LoginUserUseCase(mock_repo, mock_token)

        with pytest.raises(InvalidCredentialsError):
            await uc.execute("ghost@example.com", "whatever")

        mock_token.create_access_token.assert_not_called()


class TestRegisterUserUseCase:
    async def test_returns_user_data_and_token(self, mock_repo, mock_token, sample_user):
        mock_repo.check_user_exists.return_value = False
        mock_repo.create_user.return_value = sample_user
        uc = RegisterUserUseCase(mock_repo, mock_token)

        result = await uc.execute(
            email="user@example.com",
            username="Test User",
            phone="+1234567890",
            country_code="US",
            password="secret123",
        )

        assert result["id"] == str(sample_user.id)
        assert result["email"] == "user@example.com"
        assert result["role"] == "TRAVELER"
        assert result["token"] == "generated-jwt-token"

    async def test_checks_email_exists_before_creating(self, mock_repo, mock_token, sample_user):
        mock_repo.check_user_exists.return_value = False
        mock_repo.create_user.return_value = sample_user
        uc = RegisterUserUseCase(mock_repo, mock_token)

        await uc.execute(
            email="user@example.com",
            username="Test User",
            phone="+1234567890",
            country_code="US",
            password="secret123",
        )

        mock_repo.check_user_exists.assert_awaited_once_with("user@example.com")

    async def test_persists_user_with_hashed_password(self, mock_repo, mock_token, sample_user):
        mock_repo.check_user_exists.return_value = False
        mock_repo.create_user.return_value = sample_user
        uc = RegisterUserUseCase(mock_repo, mock_token)

        await uc.execute(
            email="new@example.com",
            username="New User",
            phone="+999",
            country_code="MX",
            password="mypassword",
        )

        mock_repo.create_user.assert_awaited_once()
        created_user = mock_repo.create_user.call_args[0][0]
        assert created_user.email == "new@example.com"
        assert created_user.full_name == "New User"
        assert created_user.role == UserRole.TRAVELER
        assert bcrypt.checkpw(b"mypassword", created_user.password)

    async def test_raises_when_email_already_exists(self, mock_repo, mock_token):
        mock_repo.check_user_exists.return_value = True
        uc = RegisterUserUseCase(mock_repo, mock_token)

        with pytest.raises(EmailAlreadyExistsError):
            await uc.execute(
                email="taken@example.com",
                username="Someone",
                phone="+1",
                country_code="US",
                password="secret123",
            )

    async def test_does_not_create_user_when_email_exists(self, mock_repo, mock_token):
        mock_repo.check_user_exists.return_value = True
        uc = RegisterUserUseCase(mock_repo, mock_token)

        with pytest.raises(EmailAlreadyExistsError):
            await uc.execute(
                email="taken@example.com",
                username="Someone",
                phone="+1",
                country_code="US",
                password="secret123",
            )

        mock_repo.create_user.assert_not_awaited()
        mock_token.create_access_token.assert_not_called()


class TestValidateTokenUseCase:
    def test_returns_user_claims(self, mock_token):
        uc = ValidateTokenUseCase(mock_token)

        result = uc.execute("valid-token")

        assert result["id"] == "user-id"
        assert result["email"] == "user@example.com"
        assert result["role"] == "TRAVELER"

    def test_calls_decode_with_token(self, mock_token):
        uc = ValidateTokenUseCase(mock_token)

        uc.execute("my-token")

        mock_token.decode_access_token.assert_called_once_with("my-token")

    def test_raises_when_token_invalid(self, mock_token):
        mock_token.decode_access_token.return_value = None
        uc = ValidateTokenUseCase(mock_token)

        with pytest.raises(InvalidTokenError):
            uc.execute("expired-token")

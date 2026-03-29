from unittest.mock import AsyncMock, MagicMock, patch

from app.application.exceptions import (
    EmailAlreadyExistsError,
    InvalidCredentialsError,
)


class TestLoginValidation:
    def test_missing_email_returns_422(self, client):
        resp = client.post("/api/v1/auth/login", json={"password": "secret123"})
        assert resp.status_code == 422

    def test_missing_password_returns_422(self, client):
        resp = client.post("/api/v1/auth/login", json={"email": "user@example.com"})
        assert resp.status_code == 422

    def test_invalid_email_format_returns_422(self, client):
        resp = client.post("/api/v1/auth/login", json={"email": "not-an-email", "password": "secret123"})
        assert resp.status_code == 422

    def test_empty_body_returns_422(self, client):
        resp = client.post("/api/v1/auth/login", json={})
        assert resp.status_code == 422

    def test_invalid_credentials_returns_401_with_error_body(self, client):
        mock_uc = MagicMock()
        mock_uc.execute = AsyncMock(side_effect=InvalidCredentialsError())

        with patch("app.adapters.inbound.api.login.get_login_use_case", return_value=mock_uc):
            resp = client.post("/api/v1/auth/login", json={"email": "user@example.com", "password": "wrong"})

        assert resp.status_code == 401
        data = resp.json()
        assert data["code"] == "INVALID_CREDENTIALS"
        assert "message" in data

    def test_401_includes_trace_id(self, client):
        mock_uc = MagicMock()
        mock_uc.execute = AsyncMock(side_effect=InvalidCredentialsError())

        with patch("app.adapters.inbound.api.login.get_login_use_case", return_value=mock_uc):
            resp = client.post(
                "/api/v1/auth/login",
                json={"email": "user@example.com", "password": "wrong"},
                headers={"x-request-id": "trace-abc-123"},
            )

        assert resp.json()["trace_id"] == "trace-abc-123"


class TestRegisterValidation:
    def test_missing_username_returns_422(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "email": "user@example.com",
            "phone": "+1",
            "country_code": "US",
            "password": "secret123",
        })
        assert resp.status_code == 422

    def test_missing_password_returns_422(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "email": "user@example.com",
            "username": "User",
            "phone": "+1",
            "country_code": "US",
        })
        assert resp.status_code == 422

    def test_invalid_email_format_returns_422(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "email": "bad-email",
            "username": "User",
            "phone": "+1",
            "country_code": "US",
            "password": "secret123",
        })
        assert resp.status_code == 422

    def test_duplicate_email_returns_409_with_error_body(self, client):
        mock_uc = MagicMock()
        mock_uc.execute = AsyncMock(side_effect=EmailAlreadyExistsError("taken@example.com"))

        with patch("app.adapters.inbound.api.login.get_register_use_case", return_value=mock_uc):
            resp = client.post("/api/v1/auth/register", json={
                "email": "taken@example.com",
                "username": "Someone",
                "phone": "+1",
                "country_code": "US",
                "password": "secret123",
            })

        assert resp.status_code == 409
        data = resp.json()
        assert data["code"] == "EMAIL_ALREADY_EXISTS"
        assert "message" in data

    def test_409_includes_trace_id(self, client):
        mock_uc = MagicMock()
        mock_uc.execute = AsyncMock(side_effect=EmailAlreadyExistsError("taken@example.com"))

        with patch("app.adapters.inbound.api.login.get_register_use_case", return_value=mock_uc):
            resp = client.post(
                "/api/v1/auth/register",
                json={
                    "email": "taken@example.com",
                    "username": "Someone",
                    "phone": "+1",
                    "country_code": "US",
                    "password": "secret123",
                },
                headers={"x-request-id": "trace-xyz-789"},
            )

        assert resp.json()["trace_id"] == "trace-xyz-789"


class TestMeValidation:
    def test_no_cookie_returns_401_with_error_body(self, client):
        resp = client.get("/api/v1/auth/me")

        assert resp.status_code == 401
        data = resp.json()
        assert data["code"] == "INVALID_TOKEN"

    def test_invalid_token_returns_401_with_error_body(self, client, mock_token_adapter):
        mock_token_adapter.decode_access_token.return_value = None

        resp = client.get("/api/v1/auth/me", cookies={"access_token": "bad-token"})

        assert resp.status_code == 401
        data = resp.json()
        assert data["code"] == "INVALID_TOKEN"

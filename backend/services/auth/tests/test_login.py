from unittest.mock import AsyncMock, MagicMock, patch


class TestLogin:
    def test_login_success(self, client, sample_user):
        mock_uc = MagicMock()
        mock_uc.execute = AsyncMock(return_value={
            "id": str(sample_user.id),
            "email": sample_user.email,
            "role": "TRAVELER",
            "token": "mock-jwt-token",
        })

        with patch("app.adapters.inbound.api.login.get_login_use_case", return_value=mock_uc):
            resp = client.post("/api/v1/auth/login", json={"email": sample_user.email, "password": "secret123"})

        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == sample_user.email
        assert data["role"] == "TRAVELER"
        assert "access_token" in resp.cookies

    def test_login_invalid_credentials_returns_401(self, client):
        from app.application.exceptions import InvalidCredentialsError

        mock_uc = MagicMock()
        mock_uc.execute = AsyncMock(side_effect=InvalidCredentialsError())

        with patch("app.adapters.inbound.api.login.get_login_use_case", return_value=mock_uc):
            resp = client.post("/api/v1/auth/login", json={"email": "ghost@example.com", "password": "whatever"})

        assert resp.status_code == 401

    def test_login_wrong_password_returns_401(self, client):
        from app.application.exceptions import InvalidCredentialsError

        mock_uc = MagicMock()
        mock_uc.execute = AsyncMock(side_effect=InvalidCredentialsError())

        with patch("app.adapters.inbound.api.login.get_login_use_case", return_value=mock_uc):
            resp = client.post("/api/v1/auth/login", json={"email": "user@example.com", "password": "wrong"})

        assert resp.status_code == 401

    def test_login_invalid_email_format_returns_422(self, client):
        resp = client.post("/api/v1/auth/login", json={"email": "not-an-email", "password": "secret123"})
        assert resp.status_code == 422


class TestRegister:
    def test_register_success(self, client, sample_user):
        mock_uc = MagicMock()
        mock_uc.execute = AsyncMock(return_value={
            "id": str(sample_user.id),
            "email": sample_user.email,
            "role": "TRAVELER",
            "token": "mock-jwt-token",
        })

        with patch("app.adapters.inbound.api.login.get_register_use_case", return_value=mock_uc):
            resp = client.post("/api/v1/auth/register", json={
                "email": sample_user.email,
                "username": sample_user.full_name,
                "phone": sample_user.phone,
                "country_code": sample_user.country_code,
                "password": "secret123",
            })

        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == sample_user.email
        assert data["role"] == "TRAVELER"
        assert "access_token" in resp.cookies

    def test_register_duplicate_email_returns_409(self, client):
        from app.application.exceptions import EmailAlreadyExistsError

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

    def test_register_missing_fields_returns_422(self, client):
        resp = client.post("/api/v1/auth/register", json={"email": "user@example.com"})
        assert resp.status_code == 422


class TestMe:
    def test_me_success(self, client, mock_token_adapter):
        mock_token_adapter.decode_access_token.return_value = {
            "sub": "user-id-123",
            "email": "user@example.com",
            "role": "TRAVELER",
        }

        resp = client.get("/api/v1/auth/me", cookies={"access_token": "valid-token"})

        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "user-id-123"
        assert data["email"] == "user@example.com"
        assert data["role"] == "TRAVELER"

    def test_me_no_cookie_returns_401(self, client):
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    def test_me_invalid_token_returns_401(self, client, mock_token_adapter):
        mock_token_adapter.decode_access_token.return_value = None

        resp = client.get("/api/v1/auth/me", cookies={"access_token": "invalid-token"})
        assert resp.status_code == 401


class TestLogout:
    def test_logout_clears_cookie(self, client):
        resp = client.post("/api/v1/auth/logout")

        assert resp.status_code == 204
        set_cookie = resp.headers.get("set-cookie", "")
        assert "access_token=" in set_cookie
        assert "Max-Age=0" in set_cookie

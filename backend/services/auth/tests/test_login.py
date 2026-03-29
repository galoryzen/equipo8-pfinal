from unittest.mock import patch


class TestLogin:
    def test_login_success(self, client, sample_user, mock_get_user_uc):
        with patch("app.adapters.inbound.api.login.get_user_by_email_use_case", return_value=mock_get_user_uc):
            resp = client.post("/api/v1/auth/login", json={"email": sample_user.email, "password": "secret123"})

        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == sample_user.email
        assert data["role"] == "TRAVELER"
        assert "access_token" in resp.cookies

    def test_login_user_not_found_returns_401(self, client, mock_get_user_uc):
        mock_get_user_uc.execute.return_value = None

        with patch("app.adapters.inbound.api.login.get_user_by_email_use_case", return_value=mock_get_user_uc):
            resp = client.post("/api/v1/auth/login", json={"email": "ghost@example.com", "password": "whatever"})

        assert resp.status_code == 401

    def test_login_wrong_password_returns_401(self, client, sample_user, mock_get_user_uc):
        with patch("app.adapters.inbound.api.login.get_user_by_email_use_case", return_value=mock_get_user_uc):
            resp = client.post("/api/v1/auth/login", json={"email": sample_user.email, "password": "wrong"})

        assert resp.status_code == 401

    def test_login_invalid_email_format_returns_422(self, client):
        resp = client.post("/api/v1/auth/login", json={"email": "not-an-email", "password": "secret123"})
        assert resp.status_code == 422


class TestRegister:
    def test_register_success(self, client, sample_user, mock_check_exists_uc, mock_create_user_uc):
        with (
            patch("app.adapters.inbound.api.login.get_check_user_exists_use_case", return_value=mock_check_exists_uc),
            patch("app.adapters.inbound.api.login.get_create_user_use_case", return_value=mock_create_user_uc),
        ):
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

    def test_register_duplicate_email_returns_409(self, client, mock_check_exists_uc):
        mock_check_exists_uc.execute.return_value = True

        with patch("app.adapters.inbound.api.login.get_check_user_exists_use_case", return_value=mock_check_exists_uc):
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

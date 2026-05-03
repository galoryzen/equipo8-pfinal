"""Auth integration tests (OBJ-004 — 2-3 of 10-12).

Covers login happy path + identity propagation, login failure, and a
role-based guard on the partner-admin endpoint.
"""

from __future__ import annotations

import httpx


async def test_login_success_returns_token_and_role(
    http_client: httpx.AsyncClient,
    traveler_email: str,
    seed_password: str,
) -> None:
    resp = await http_client.post(
        "/api/v1/auth/login",
        json={"email": traveler_email, "password": seed_password},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["email"] == traveler_email
    assert body["role"] == "TRAVELER"
    assert isinstance(body.get("token"), str) and body["token"]

    # /me reads the access_token cookie set by /login. Reuse the same client
    # so the cookie carries over. We don't pin to a specific payload shape
    # because the JWT validation use case may return either {sub, role} or
    # {user_id, role}; we just want to confirm the token round-trips.
    me = await http_client.get("/api/v1/auth/me")
    assert me.status_code == 200, me.text
    me_body = me.json()
    assert me_body.get("role") == "TRAVELER", me_body


async def test_login_invalid_credentials_returns_401(
    gateway_url: str,
    traveler_email: str,
) -> None:
    # Use a fresh client so cookies from earlier tests can't leak in.
    async with httpx.AsyncClient(base_url=gateway_url, timeout=10.0) as client:
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": traveler_email, "password": "definitely-wrong"},
        )
    assert resp.status_code == 401, resp.text
    assert '"token"' not in resp.text


async def test_partner_admin_endpoint_rejects_traveler_token(
    http_client: httpx.AsyncClient,
    traveler_token: str,
    partner_admin_secret: str,
) -> None:
    """The admin/partner-users endpoint is gated by X-Partner-Admin-Key, not
    by JWT. A traveler bearer token without the partner key must be denied.
    """
    resp = await http_client.post(
        "/api/v1/auth/admin/partner-users",
        headers={"Authorization": f"Bearer {traveler_token}"},
        json={
            "email": "intruder@example.com",
            "full_name": "Should Not Pass",
            "phone": "+10000000000",
            "country_code": "US",
            "password": "irrelevant",
            "role": "HOTEL",
            "hotel_id": "00000000-0000-0000-0000-000000000000",
        },
    )
    assert 401 <= resp.status_code < 500, (
        f"expected client-error rejection, got {resp.status_code}: {resp.text}"
    )

    # Sanity: providing the correct partner key would have been accepted at
    # the auth gate (we don't actually create the user — verify only that the
    # rejection above is about the key, not the JWT). We send a deliberately
    # invalid body so the request still fails, but for a *different* reason.
    resp_with_key = await http_client.post(
        "/api/v1/auth/admin/partner-users",
        headers={"X-Partner-Admin-Key": partner_admin_secret},
        json={"this_payload": "is_invalid"},
    )
    # 422 (validation) or 400 means we got past the gate; >=500 is a server
    # bug. Anything else is fine — we just want to confirm the gate moved.
    assert resp_with_key.status_code != 401, (
        "partner key was rejected when it should have been accepted: "
        f"{resp_with_key.text}"
    )

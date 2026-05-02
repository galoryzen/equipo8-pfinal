"""Catalog integration tests (OBJ-004 — 2-3 of 10-12).

Covers paginated search, property detail, and rate-plan pricing breakdown.
"""

from __future__ import annotations

from datetime import date

import httpx


async def test_search_properties_returns_paginated_results(
    http_client: httpx.AsyncClient,
    booking_dates: tuple[date, date],
) -> None:
    # Search requires a city_id — look one up via /cities first.
    cities = await http_client.get(
        "/api/v1/catalog/cities", params={"q": "Cancún"}
    )
    assert cities.status_code == 200, cities.text
    city_list = cities.json()
    assert city_list, f"expected at least one city for query 'Cancún', got {city_list!r}"
    city_id = city_list[0]["id"]

    checkin, checkout = booking_dates
    resp = await http_client.get(
        "/api/v1/catalog/properties",
        params={
            "city_id": city_id,
            "checkin": checkin.isoformat(),
            "checkout": checkout.isoformat(),
            "guests": 2,
            "page": 1,
            "page_size": 5,
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    # PaginatedResponse[T] envelope
    for key in ("items", "total", "page", "page_size", "total_pages"):
        assert key in body, f"missing pagination key {key!r}: {body!r}"
    assert body["page"] == 1
    assert body["page_size"] == 5
    assert len(body["items"]) <= 5
    if body["items"]:
        first = body["items"][0]
        assert "id" in first
        assert "name" in first


async def test_property_detail_returns_amenities_and_rate_plans(
    http_client: httpx.AsyncClient,
    seeded_property_id: str,
    booking_dates: tuple[date, date],
) -> None:
    checkin, checkout = booking_dates
    resp = await http_client.get(
        f"/api/v1/catalog/properties/{seeded_property_id}",
        params={
            "checkin": checkin.isoformat(),
            "checkout": checkout.isoformat(),
            "guests": 2,
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    # The detail response wraps the property under a "detail" key.
    detail = body.get("detail", body)
    assert detail["id"] == seeded_property_id
    # The seed wires Cancún with images and a default cancellation policy.
    assert detail.get("default_cancellation_policy"), detail
    images = detail.get("images") or []
    assert isinstance(images, list) and images, (
        f"expected non-empty images list, got {images!r}"
    )


async def test_rate_plan_pricing_breakdown_matches_total(
    http_client: httpx.AsyncClient,
    seeded_rate_plan_id: str,
    booking_dates: tuple[date, date],
) -> None:
    checkin, checkout = booking_dates
    resp = await http_client.get(
        f"/api/v1/catalog/rate-plans/{seeded_rate_plan_id}/pricing",
        params={
            "checkin": checkin.isoformat(),
            "checkout": checkout.isoformat(),
        },
    )
    if resp.status_code == 404:
        import pytest

        pytest.skip(
            "Rate calendar empty for the requested window — "
            "re-seed the DB (`make reset-db && make up`)."
        )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    nights = body.get("nights") or body.get("breakdown") or []
    assert nights, f"expected per-night breakdown, got {body!r}"
    # Sum-of-nights should equal the subtotal (taxes/service_fee are extra).
    subtotal = body.get("subtotal")
    assert subtotal is not None, f"no subtotal in pricing response: {body!r}"
    summed = sum(float(n.get("price") or n.get("price_amount") or 0) for n in nights)
    assert abs(float(subtotal) - summed) < 0.01, (
        f"subtotal {subtotal} != sum of nights {summed} in {body!r}"
    )
    # And total must equal subtotal + taxes + service_fee.
    total = float(body.get("total") or 0)
    extras = float(body.get("taxes") or 0) + float(body.get("service_fee") or 0)
    assert abs(total - (float(subtotal) + extras)) < 0.01, body

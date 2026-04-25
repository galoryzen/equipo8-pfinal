from decimal import Decimal

from app.domain.revenue_report_calc import RevenueKpiRaw, build_revenue_report_kpis


def test_build_revenue_report_kpis_basic_variations():
    current = RevenueKpiRaw(
        total_revenue=Decimal("1000"),
        sold_room_nights=20.0,
        occupied_room_nights=20.0,
        capacity_room_nights=40.0,
        has_activity=True,
    )
    previous = RevenueKpiRaw(
        total_revenue=Decimal("800"),
        sold_room_nights=16.0,
        occupied_room_nights=16.0,
        capacity_room_nights=40.0,
        has_activity=True,
    )

    out = build_revenue_report_kpis(current, previous)
    assert out["totalRevenue"]["variation"] == 25.0
    assert out["adr"]["variation"] == 0.0
    assert out["occupancyRate"]["variation"] == 25.0


def test_build_revenue_report_kpis_without_previous_activity_variation_zero():
    current = RevenueKpiRaw(
        total_revenue=Decimal("500"),
        sold_room_nights=10.0,
        occupied_room_nights=8.0,
        capacity_room_nights=20.0,
        has_activity=True,
    )
    previous = RevenueKpiRaw(
        total_revenue=Decimal("0"),
        sold_room_nights=0.0,
        occupied_room_nights=0.0,
        capacity_room_nights=20.0,
        has_activity=False,
    )

    out = build_revenue_report_kpis(current, previous)
    assert out["totalRevenue"]["variation"] == 0.0
    assert out["adr"]["variation"] == 0.0
    assert out["occupancyRate"]["variation"] == 0.0


def test_build_revenue_report_kpis_previous_zero_with_activity_returns_growth():
    current = RevenueKpiRaw(
        total_revenue=Decimal("300"),
        sold_room_nights=6.0,
        occupied_room_nights=6.0,
        capacity_room_nights=12.0,
        has_activity=True,
    )
    previous = RevenueKpiRaw(
        total_revenue=Decimal("0"),
        sold_room_nights=0.0,
        occupied_room_nights=0.0,
        capacity_room_nights=12.0,
        has_activity=True,
    )

    out = build_revenue_report_kpis(current, previous)
    assert out["totalRevenue"]["variation"] == 100.0
    assert out["adr"]["variation"] == 100.0
    assert out["occupancyRate"]["variation"] == 100.0

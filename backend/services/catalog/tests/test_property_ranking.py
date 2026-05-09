"""Unit tests for ``app.domain.ranking.property_ranking`` (acceptance criteria)."""

from uuid import uuid4

import pytest

from app.domain.ranking.property_ranking import RankingWeights, rank_properties


def _item(
    *,
    name: str,
    price: float | None,
    rating: float | None,
    popularity: float | None,
    distance_km: float | None,
):
    pid = uuid4()
    return {
        "id": pid,
        "name": name,
        "min_price": price,
        "rating_avg": rating,
        "review_count": 1,
        "city": {"id": uuid4(), "name": "X", "department": None, "country": "MX"},
        "_ranking": {
            "price": price,
            "rating": rating,
            "popularity": popularity,
            "distance_km": distance_km,
        },
    }


class TestRankingApplies:
    def test_unordered_input_returns_sorted_by_score(self):
        """AC: ranking applies — output order differs from arbitrary input order."""
        a = _item(name="A", price=52.0, rating=4.0, popularity=1500.0, distance_km=22.0)
        b = _item(name="B", price=128.0, rating=5.0, popularity=450.0, distance_km=1.5)
        c = _item(name="C", price=215.0, rating=3.0, popularity=1450.0, distance_km=None)
        shuffled = [c, a, b]
        out = rank_properties(shuffled)
        names = [x["name"] for x in out]
        assert names == ["B", "A", "C"]


class TestMultiFactorBehavior:
    def test_higher_rating_can_outrank_slightly_lower_price(self):
        cheap_bad = _item(name="cheap", price=10.0, rating=2.0, popularity=10.0, distance_km=10.0)
        pricey_good = _item(name="pricey", price=100.0, rating=5.0, popularity=500.0, distance_km=1.0)
        w = RankingWeights(price=0.15, rating=0.65, popularity=0.10, distance=0.10)
        out = rank_properties([cheap_bad, pricey_good], context=w)
        assert [x["name"] for x in out] == ["pricey", "cheap"]


class TestTieBreaking:
    def test_same_price_popularity_distance_prioritizes_rating(self):
        """Equal price, popularity, distance → higher review average wins."""
        low = _item(name="low_rating", price=100.0, rating=3.0, popularity=200.0, distance_km=4.0)
        high = _item(name="high_rating", price=100.0, rating=5.0, popularity=200.0, distance_km=4.0)
        out = rank_properties([low, high])
        assert [x["name"] for x in out] == ["high_rating", "low_rating"]

    def test_same_score_breaks_on_popularity_then_distance(self):
        """When rating+price ties, popularity then distance break the tie."""
        a = _item(name="less_pop_far", price=50.0, rating=4.0, popularity=10.0, distance_km=10.0)
        b = _item(name="more_pop_close", price=50.0, rating=4.0, popularity=500.0, distance_km=1.0)
        out = rank_properties([a, b])
        assert [x["name"] for x in out] == ["more_pop_close", "less_pop_far"]


class TestFiltersInteraction:
    def test_ranking_recomputed_on_subset(self):
        """Only filtered rows participate in min-max normalization."""
        a = _item(name="A", price=52.0, rating=4.0, popularity=1500.0, distance_km=22.0)
        b = _item(name="B", price=128.0, rating=5.0, popularity=450.0, distance_km=1.5)
        filtered = [a, b]
        out = rank_properties(filtered)
        assert [x["name"] for x in out] == ["B", "A"]


class TestMissingData:
    def test_missing_rating_and_distance_does_not_crash(self):
        x = _item(name="x1", price=80.0, rating=None, popularity=100.0, distance_km=None)
        y = _item(name="x2", price=90.0, rating=4.5, popularity=None, distance_km=3.0)
        out = rank_properties([x, y])
        assert len(out) == 2
        assert {o["name"] for o in out} == {"x1", "x2"}
        assert "_ranking" not in out[0]

    def test_missing_distance_penalized_when_other_factors_equal(self):
        """Unknown POI distance scores 0.0 on the distance axis vs a known km."""
        known = _item(name="with_km", price=100.0, rating=4.0, popularity=200.0, distance_km=4.0)
        missing = _item(name="no_km", price=100.0, rating=4.0, popularity=200.0, distance_km=None)
        out = rank_properties([missing, known])
        assert [o["name"] for o in out] == ["with_km", "no_km"]

    def test_all_distances_missing_is_fair_tie_then_other_axes(self):
        """No candidate has POI km → all get 0.0 on distance; rating breaks the tie."""
        low = _item(name="a", price=100.0, rating=3.0, popularity=50.0, distance_km=None)
        high = _item(name="b", price=100.0, rating=5.0, popularity=50.0, distance_km=None)
        out = rank_properties([low, high])
        assert [o["name"] for o in out] == ["b", "a"]

    def test_all_prices_missing_uses_neutral_and_stable_order(self):
        a = {"id": uuid4(), "name": "n1", "min_price": None, "rating_avg": 4.0, "review_count": 0}
        b = {"id": uuid4(), "name": "n2", "min_price": None, "rating_avg": 3.0, "review_count": 0}
        a["_ranking"] = {"price": None, "rating": 4.0, "popularity": 1.0, "distance_km": 1.0}
        b["_ranking"] = {"price": None, "rating": 3.0, "popularity": 2.0, "distance_km": 2.0}
        out = rank_properties([b, a])
        assert out[0]["name"] == "n1"


def test_custom_weights_change_order():
    a = _item(name="cheap", price=1.0, rating=2.0, popularity=1.0, distance_km=50.0)
    b = _item(name="dear", price=999.0, rating=5.0, popularity=999.0, distance_km=0.5)
    w_price = RankingWeights(price=0.95, rating=0.02, popularity=0.02, distance=0.01)
    cheap_first = rank_properties([b, a], context=w_price)
    assert [x["name"] for x in cheap_first] == ["cheap", "dear"]
    w_rating = RankingWeights(price=0.05, rating=0.90, popularity=0.03, distance=0.02)
    dear_first = rank_properties([a, b], context=w_rating)
    assert [x["name"] for x in dear_first] == ["dear", "cheap"]


def test_ranking_weights_must_sum_to_one():
    with pytest.raises(ValueError):
        RankingWeights(price=0.5, rating=0.5, popularity=0.5, distance=0.5)

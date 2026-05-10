"""
Multi-factor property search ranking (pure functions).

Used after SQL filters have narrowed the candidate set. Each item is a dict
with optional ``_ranking`` metadata (attached by the repository for
``sort_by=relevance``). If ``_ranking`` is absent, factors are inferred from
public summary fields where possible (``min_price``, ``rating_avg``,
``distance_to_poi_km``); missing ``popularity`` defaults to neutral handling;
missing **distance** is penalized (see Missing values below).

Weights (tunable; sum = 1.0)
---------------------------
- **price (0.28)** — Travelers are price-sensitive; lower nightly rate = higher score.
- **rating (0.28)** — Social proof from reviews; higher average = higher score.
- **popularity (0.22)** — Proxy for demand/bookings (``popularity_score`` in DB).
- **distance (0.22)** — Proximity to a reference tourist POI (km); shorter = higher score.

Justification: balanced emphasis on affordability and quality, with measurable
demand and location as secondary but explicit signals (acceptance criteria).

Formula
-------
For each property after min-max normalization to [0, 1] within the *filtered* batch::

    score = w_price * n_price + w_rating * n_rating + w_popularity * n_popularity + w_distance * n_distance

- ``n_price``: lower ``min_price`` → higher value (inverted min-max).
- ``n_distance``: lower km → higher value (inverted min-max).

Missing values
--------------
- **Price, rating, popularity:** neutral **0.5** on that dimension when unknown.
- **Distance:** unknown km is **penalized** (normalized score **0.0**) so listings
  without a POI distance do not get a “free pass” against competitors that do.
  If *every* candidate lacks distance, all receive **0.0** on this axis (tie).

Tie-break (similar composite score)
----------------------------------
Descending: composite score → ``rating`` → ``popularity`` → inverted ``distance``
(shorter first) → ``property_id`` (stable, deterministic).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID


@dataclass(frozen=True)
class RankingWeights:
    price: float = 0.28
    rating: float = 0.28
    popularity: float = 0.22
    distance: float = 0.22

    def __post_init__(self) -> None:
        s = self.price + self.rating + self.popularity + self.distance
        if abs(s - 1.0) > 1e-6:
            raise ValueError("RankingWeights must sum to 1.0")


DEFAULT_WEIGHTS = RankingWeights()


def _neutral_norm() -> float:
    return 0.5


_MISSING_DISTANCE_NORM = 0.0


def _min_max_normalize_distances(distances: list[float | None]) -> list[float]:
    """
    Lower km → higher score (inverted min-max). ``None`` → worst score (0.0).

    If no property has a distance, every row gets 0.0 on this axis (fair tie).
    If exactly one numeric distance exists in the batch, that row scores 1.0
    and all ``None`` rows score 0.0.
    """
    present = [v for v in distances if v is not None]
    if not present:
        return [_MISSING_DISTANCE_NORM for _ in distances]
    lo, hi = min(present), max(present)
    out: list[float] = []
    for v in distances:
        if v is None:
            out.append(_MISSING_DISTANCE_NORM)
        elif hi > lo:
            t = (v - lo) / (hi - lo)
            out.append(1.0 - t)
        else:
            out.append(1.0)
    return out


def _min_max_normalize(values: list[float | None], *, invert: bool) -> list[float]:
    """Map known numeric values to [0,1]; None positions get neutral 0.5."""
    present = [v for v in values if v is not None]
    if not present:
        return [_neutral_norm() for _ in values]
    lo, hi = min(present), max(present)
    out: list[float] = []
    for v in values:
        if v is None:
            out.append(_neutral_norm())
        elif hi > lo:
            t = (v - lo) / (hi - lo)
            out.append(1.0 - t if invert else t)
        else:
            out.append(_neutral_norm())
    return out


def _as_float(v: Any) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _extract_ranking_row(item: dict[str, Any]) -> dict[str, Any]:
    blob = item.get("_ranking")
    if isinstance(blob, dict):
        return {
            "price": _as_float(blob.get("price")),
            "rating": _as_float(blob.get("rating")),
            "popularity": _as_float(blob.get("popularity")),
            "distance_km": _as_float(blob.get("distance_km")),
        }
    mp = item.get("min_price")
    ra = item.get("rating_avg")
    dist = item.get("distance_to_poi_km")
    return {
        "price": _as_float(mp),
        "rating": _as_float(ra),
        "popularity": _as_float(item.get("popularity_score")),
        "distance_km": _as_float(dist),
    }


def rank_properties(
    properties: list[dict[str, Any]],
    *,
    context: RankingWeights | None = None,
) -> list[dict[str, Any]]:
    """
    Return ``properties`` sorted by multi-factor score (desc), then tie-breakers.

    Strips internal ``_ranking`` keys from returned dicts. Does not mutate inputs.
    """
    if len(properties) <= 1:
        return [_strip_ranking(dict(p)) for p in properties]

    w = context or DEFAULT_WEIGHTS
    rows = [_extract_ranking_row(p) for p in properties]

    prices: list[float | None] = [r.get("price") for r in rows]
    ratings: list[float | None] = [r.get("rating") for r in rows]
    popularities: list[float | None] = [r.get("popularity") for r in rows]
    distances: list[float | None] = [r.get("distance_km") for r in rows]

    n_price = _min_max_normalize(prices, invert=True)
    n_rating = _min_max_normalize(ratings, invert=False)
    n_pop = _min_max_normalize(popularities, invert=False)
    n_dist = _min_max_normalize_distances(distances)

    scored: list[tuple[int, dict[str, Any], float, tuple]] = []
    for i, raw in enumerate(properties):
        score = (
            w.price * n_price[i]
            + w.rating * n_rating[i]
            + w.popularity * n_pop[i]
            + w.distance * n_dist[i]
        )
        r = rows[i]
        pid = raw.get("id")
        if isinstance(pid, UUID):
            pid_key = str(pid)
        else:
            pid_key = str(pid or "")

        rating_tie = r.get("rating") if r.get("rating") is not None else -1.0
        pop_tie = r.get("popularity") if r.get("popularity") is not None else -1.0
        dist_tie = r.get("distance_km") if r.get("distance_km") is not None else float("inf")

        tie = (score, rating_tie, pop_tie, -dist_tie, pid_key)
        scored.append((i, dict(raw), score, tie))

    scored.sort(key=lambda x: x[3], reverse=True)
    return [_strip_ranking(x[1]) for x in scored]


def _strip_ranking(item: dict[str, Any]) -> dict[str, Any]:
    out = {k: v for k, v in item.items() if k != "_ranking"}
    return out

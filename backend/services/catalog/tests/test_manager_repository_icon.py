"""Tests for room-type icon derivation used in manager room-type list."""

import pytest

from app.adapters.outbound.db.manager_repository import _icon_from_name


@pytest.mark.parametrize(
    "name,expected",
    [
        ("Grand Penthouse", "penthouse"),
        ("penthouse deluxe", "penthouse"),
        ("Executive Suite", "suite"),
        ("Junior suite", "suite"),
        ("King Room", "king"),
        ("Double Queen", "double"),
        ("Twin Beds", "double"),
        ("Classic Room", "standard"),
        ("", "standard"),
    ],
)
def test_icon_from_name(name, expected):
    assert _icon_from_name(name) == expected

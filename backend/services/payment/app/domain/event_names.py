"""Canonical event type names (see backend/CLAUDE.md → Inter-service communication)."""

from contracts.events.payment import PAYMENT_AUTHORIZED, PAYMENT_FAILED

__all__ = ["PAYMENT_AUTHORIZED", "PAYMENT_FAILED"]

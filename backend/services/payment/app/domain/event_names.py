"""Canonical event type names (see backend/CLAUDE.md → Inter-service communication)."""

from contracts.events.payment import PAYMENT_FAILED, PAYMENT_SUCCEEDED

__all__ = ["PAYMENT_FAILED", "PAYMENT_SUCCEEDED"]

class InvalidTokenError(Exception):
    """JWT missing or invalid."""


class BookingNotFoundError(Exception):
    """Booking does not exist or is not visible to the caller."""


class BookingSnapshotError(Exception):
    """Could not load booking from booking service."""


class BookingNotPayableError(Exception):
    """Booking is not in a payable state or hold expired."""


class PaymentIntentNotFoundError(Exception):
    pass


class PaymentNotAllowedError(Exception):
    """User cannot act on this intent."""


class PaymentAlreadyTerminalError(Exception):
    """Intent already succeeded or failed — idempotent no-op for duplicate operations."""


class InvalidMockPaymentTokenError(Exception):
    pass


class WebhookAuthError(Exception):
    pass


class WebhookIdempotentReplayError(Exception):
    """Duplicate webhook with same idempotency key — caller should return success without side effects."""

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

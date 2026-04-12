class InvalidTokenError(Exception):
    """Raised when the JWT is missing, malformed, or invalid."""


class BookingNotFoundError(Exception):
    """Raised when a booking does not exist or is not visible to the current user."""

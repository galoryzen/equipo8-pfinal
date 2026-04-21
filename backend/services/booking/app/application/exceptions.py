class InvalidTokenError(Exception):
    """Raised when the JWT is missing, malformed, or invalid."""


class BookingNotFoundError(Exception):
    """Raised when a booking does not exist or is not visible to the current user."""


class InvalidBookingStateError(Exception):
    """Raised when an operation is attempted on a booking in a state that does not allow it."""


class InventoryUnavailableError(Exception):
    """Raised when Catalog rejects a create_hold because inventory is insufficient (409)."""


class CatalogUnavailableError(Exception):
    """Raised on network / server errors talking to Catalog — caller decides retry policy."""


class ConflictingActiveCartError(Exception):
    """Raised when the user already has an active CART booking (different selection).

    Surfaced as 409 with the existing booking_id so the client can offer the user
    the option to resume or cancel it before creating a new one.
    """

    def __init__(self, existing_booking_id):
        self.existing_booking_id = existing_booking_id
        super().__init__(f"User already has active cart {existing_booking_id}")


class GuestsValidationError(Exception):
    """Base for guest payload validation errors on a booking."""


class GuestsCountMismatchError(GuestsValidationError):
    """Raised when the number of submitted guests does not match booking.guests_count."""


class PrimaryGuestRequiredError(GuestsValidationError):
    """Raised when the submitted guest list has zero or more than one primary."""


class PrimaryGuestMissingContactError(GuestsValidationError):
    """Raised when the primary guest is missing required email or phone."""

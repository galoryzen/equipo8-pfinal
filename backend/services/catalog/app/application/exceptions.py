from uuid import UUID


class PropertyNotFoundError(Exception):
    def __init__(self, property_id: UUID):
        self.property_id = property_id
        super().__init__(f"Property {property_id} not found")


class PropertyImageNotFoundError(Exception):
    """Raised when a property image cannot be found within its parent property."""

    def __init__(self, image_id: UUID):
        self.image_id = image_id
        super().__init__(f"Property image {image_id} not found")


class AmenityNotFoundError(Exception):
    """Raised when one or more amenity codes do not match an existing amenity row."""

    def __init__(self, codes: list[str]):
        self.codes = codes
        super().__init__(f"Unknown amenity codes: {codes}")


class InsufficientInventoryError(Exception):
    """Raised when create_hold cannot fully cover the requested date range."""

    def __init__(self, room_type_id: UUID | None = None):
        self.room_type_id = room_type_id
        super().__init__(
            f"Insufficient inventory for room_type {room_type_id}"
            if room_type_id is not None
            else "Insufficient inventory"
        )


class PromotionError(Exception):
    """Raised when promotion creation fails (e.g. rate_plan not found for property)."""

    def __init__(self, detail: str = "Promotion creation failed"):
        self.detail = detail
        super().__init__(detail)


class UnauthorizedError(Exception):
    """Raised when the requester does not have the required role or claim."""

    def __init__(self, detail: str = "Unauthorized"):
        self.detail = detail
        super().__init__(detail)


class RatePlanNotFoundError(Exception):
    def __init__(self, rate_plan_id: UUID):
        self.rate_plan_id = rate_plan_id
        super().__init__(f"Rate plan {rate_plan_id} not found")


class RateUnavailableError(Exception):
    """Raised when one or more days in the requested range have no rate_calendar entry.

    A missing day means the rate plan is not bookable for that range — clients
    should be told to pick different dates rather than receive a partial total.
    """

    def __init__(self, missing_days: list):
        self.missing_days = missing_days
        super().__init__(f"Rate not available for days: {missing_days}")


class RateCurrencyMismatchError(Exception):
    """Raised when rate_calendar rows in the requested range mix currencies."""

    def __init__(self, currencies: list[str]):
        self.currencies = currencies
        super().__init__(f"Rate plan calendar mixes currencies: {currencies}")

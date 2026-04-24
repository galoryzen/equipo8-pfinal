from uuid import UUID


class PropertyNotFoundError(Exception):
    def __init__(self, property_id: UUID):
        self.property_id = property_id
        super().__init__(f"Property {property_id} not found")


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

from uuid import UUID


class PropertyNotFoundError(Exception):
    def __init__(self, property_id: UUID):
        self.property_id = property_id
        super().__init__(f"Property {property_id} not found")

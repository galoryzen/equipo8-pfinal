class InvalidCredentialsError(Exception):
    def __init__(self) -> None:
        super().__init__("Invalid credentials")


class EmailAlreadyExistsError(Exception):
    def __init__(self, email: str) -> None:
        self.email = email
        super().__init__(f"Email {email} is already registered")


class InvalidTokenError(Exception):
    def __init__(self) -> None:
        super().__init__("Invalid or expired token")


class InvalidPartnerOrganizationError(Exception):
    """Hotel/agency missing, not ACTIVE, or not consistent with organization_type."""

    def __init__(self) -> None:
        super().__init__("Organization is missing, inactive, or does not match the requested partner role")

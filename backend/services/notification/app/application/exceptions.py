class NotificationEnrichmentError(Exception):
    """Raised when an upstream service fails to enrich booking data for an email."""


class InvalidTokenError(Exception):
    """Raised when an inbound JWT is missing, malformed, or expired."""


class NoActiveTokensError(Exception):
    """Raised when a push send is requested for a user with no active devices."""

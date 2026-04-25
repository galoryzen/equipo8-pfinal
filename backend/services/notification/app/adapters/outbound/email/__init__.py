from app.adapters.outbound.email.logging_sender import LoggingEmailSender
from app.adapters.outbound.email.ses_sender import SesEmailSender
from app.application.ports.outbound.email_sender import EmailSender

_SUPPORTED_BACKENDS = {"ses", "logging"}


def build_email_sender(
    backend: str,
    *,
    from_address: str,
    aws_region: str | None = None,
) -> EmailSender:
    backend = backend.lower()
    if backend == "logging":
        return LoggingEmailSender(from_address=from_address)
    if backend == "ses":
        if not aws_region:
            raise ValueError("aws_region is required for backend='ses'")
        return SesEmailSender(from_address=from_address, region=aws_region)
    raise ValueError(
        f"Unsupported email backend {backend!r}; must be one of {sorted(_SUPPORTED_BACKENDS)}"
    )

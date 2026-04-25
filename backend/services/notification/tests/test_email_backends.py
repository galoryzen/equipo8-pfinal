import pytest

from app.adapters.outbound.email import build_email_sender
from app.adapters.outbound.email.logging_sender import LoggingEmailSender
from app.adapters.outbound.email.ses_sender import SesEmailSender


def test_factory_returns_logging_sender():
    sender = build_email_sender("logging", from_address="noreply@test.com")
    assert isinstance(sender, LoggingEmailSender)


def test_factory_returns_ses_sender():
    sender = build_email_sender("ses", from_address="noreply@test.com", aws_region="us-east-1")
    assert isinstance(sender, SesEmailSender)


def test_factory_case_insensitive():
    assert isinstance(
        build_email_sender("LOGGING", from_address="noreply@test.com"), LoggingEmailSender
    )


def test_factory_raises_when_ses_missing_region():
    with pytest.raises(ValueError, match="aws_region is required"):
        build_email_sender("ses", from_address="noreply@test.com")


def test_factory_raises_on_unknown_backend():
    with pytest.raises(ValueError, match="Unsupported email backend"):
        build_email_sender("smtp", from_address="noreply@test.com")


@pytest.mark.asyncio
async def test_logging_sender_returns_local_message_id():
    sender = LoggingEmailSender(from_address="noreply@test.com")
    message_id = await sender.send(
        to="ana@test.com", subject="Hola", html="<p>hi</p>", text="hi"
    )
    assert message_id.startswith("local-")

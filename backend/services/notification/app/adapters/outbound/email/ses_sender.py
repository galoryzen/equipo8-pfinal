import logging

import aioboto3

from app.application.ports.outbound.email_sender import EmailSender

logger = logging.getLogger(__name__)


class SesEmailSender(EmailSender):
    """Send email through Amazon SES using the async boto3 client.

    Relies on IAM (ECS task role) for credentials. The `from_address` must be
    covered by the SES domain identity verified for the sending account, and
    must match the `ses:FromAddress` condition in the IAM policy.
    """

    def __init__(self, from_address: str, region: str):
        self._from = from_address
        self._region = region
        self._session = aioboto3.Session()

    async def send(self, *, to: str, subject: str, html: str, text: str) -> str:
        async with self._session.client("ses", region_name=self._region) as ses:
            resp = await ses.send_email(
                Source=self._from,
                Destination={"ToAddresses": [to]},
                Message={
                    "Subject": {"Data": subject, "Charset": "UTF-8"},
                    "Body": {
                        "Text": {"Data": text, "Charset": "UTF-8"},
                        "Html": {"Data": html, "Charset": "UTF-8"},
                    },
                },
            )
        message_id = resp["MessageId"]
        logger.info("email sent via SES to=%s subject=%s message_id=%s", to, subject, message_id)
        return message_id

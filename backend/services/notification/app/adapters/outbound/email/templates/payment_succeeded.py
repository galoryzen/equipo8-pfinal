from dataclasses import dataclass
from decimal import Decimal


@dataclass
class PaymentSucceededContext:
    full_name: str
    transaction_reference: str
    amount: Decimal
    currency: str


def render_payment_succeeded(ctx: PaymentSucceededContext) -> tuple[str, str, str]:
    """Return (subject, text_body, html_body) for the payment succeeded email."""
    subject = "Pago aprobado en TravelHub"
    total_formatted = f"{ctx.amount} {ctx.currency}"
    text = (
        f"Hola {ctx.full_name},\n\n"
        f"Tu pago ha sido aprobado exitosamente.\n\n"
        f"Referencia de transacción: {ctx.transaction_reference}\n"
        f"Total cobrado: {total_formatted}\n\n"
        f"Gracias por usar TravelHub."
    )

    html = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>{subject}</title></head>
<body style="font-family: Arial, sans-serif; color: #1f2937; background:#f9fafb; margin:0; padding:24px;">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);overflow:hidden;">
    <tr><td style="padding:32px;">
      <h1 style="margin:0 0 16px 0;color:#15803d;">Pago aprobado</h1>
      <p style="margin:0 0 16px 0;">Hola <strong>{ctx.full_name}</strong>, tu pago ha sido aprobado exitosamente.</p>
      <table role="presentation" width="100%" style="border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 0;color:#6b7280;">Referencia de transacción</td><td style="padding:8px 0;text-align:right;"><strong>{ctx.transaction_reference}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Total cobrado</td><td style="padding:8px 0;text-align:right;"><strong>{total_formatted}</strong></td></tr>
      </table>
      <p style="margin:24px 0 0 0;color:#6b7280;font-size:14px;">Gracias por usar TravelHub.</p>
    </td></tr>
  </table>
</body>
</html>"""
    return subject, text, html

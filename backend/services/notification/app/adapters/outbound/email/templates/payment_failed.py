from dataclasses import dataclass
from datetime import date
from decimal import Decimal

@dataclass
class PaymentFailedContext:
    full_name: str
    transaction_reference: str
    suggested_action: str
    property_name: str | None = None
    property_image_url: str | None = None


def render_payment_failed(ctx: PaymentFailedContext) -> tuple[str, str, str]:
    """Return (subject, text_body, html_body) for the payment failed email."""
    subject = f"Pago rechazado en TravelHub"
    text = f"""Hola {ctx.full_name},\n\nTu pago no pudo ser procesado.\n\nReferencia de transacción: {ctx.transaction_reference}\nSiguiente acción sugerida: {ctx.suggested_action}\n\nPor favor, intenta con otro método de pago o revisa los detalles ingresados.\n\nGracias por usar TravelHub."""

    hero_html = (
      f'<img src="{ctx.property_image_url}" alt="{ctx.property_name or \"Propiedad\"}" '
      'style="display:block;width:100%;max-width:560px;height:auto;border-radius:8px 8px 0 0;" />'
      if ctx.property_image_url
      else ""
    )

    html = f"""<!DOCTYPE html>
<html lang=\"es\">
<head><meta charset=\"UTF-8\"><title>{subject}</title></head>
<body style=\"font-family: Arial, sans-serif; color: #1f2937; background:#f9fafb; margin:0; padding:24px;\">
  <table role=\"presentation\" width=\"100%\" style=\"max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);overflow:hidden;\">
    <tr><td style=\"padding:0;\">{hero_html}</td></tr>
    <tr><td style=\"padding:32px;\">
      <h1 style=\"margin:0 0 16px 0;color:#b91c1c;\">Pago rechazado</h1>
      <p style=\"margin:0 0 16px 0;\">Hola <strong>{ctx.full_name}</strong>, tu pago no pudo ser procesado.</p>
      <table role=\"presentation\" width=\"100%\" style=\"border-collapse:collapse;margin:16px 0;\">
        <tr><td style=\"padding:8px 0;color:#6b7280;\">Referencia de transacción</td><td style=\"padding:8px 0;text-align:right;\"><strong>{ctx.transaction_reference}</strong></td></tr>
        <tr><td style=\"padding:8px 0;color:#6b7280;\">Siguiente acción sugerida</td><td style=\"padding:8px 0;text-align:right;\">{ctx.suggested_action}</td></tr>
      </table>
      <p style=\"margin:24px 0 0 0;color:#6b7280;font-size:14px;\">Por favor, intenta con otro método de pago o revisa los detalles ingresados.<br/>Gracias por usar TravelHub.</p>
    </td></tr>
  </table>
</body>
</html>"""
    return subject, text, html

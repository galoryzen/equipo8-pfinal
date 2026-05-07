from dataclasses import dataclass


@dataclass
class BookingRejectedContext:
    full_name: str
    reason: str | None
    refund_percent: int


def render_booking_rejected(ctx: BookingRejectedContext) -> tuple[str, str, str]:
    """Return (subject, text_body, html_body) for the booking rejected email."""
    subject = "Reserva rechazada en TravelHub"
    reason_line = f"\nMotivo: {ctx.reason}" if ctx.reason else ""
    text = f"""Hola {ctx.full_name},\n\nLamentamos informarte que tu reserva ha sido rechazada por el alojamiento.{reason_line}\n\nSe ha emitido un reembolso del {ctx.refund_percent}%.\n\nGracias por usar TravelHub."""

    reason_row = (
        f'<tr><td style="padding:8px 0;color:#6b7280;">Motivo</td>'
        f'<td style="padding:8px 0;text-align:right;">{ctx.reason}</td></tr>'
        if ctx.reason
        else ""
    )

    html = f"""<!DOCTYPE html>
<html lang=\"es\">
<head><meta charset=\"UTF-8\"><title>{subject}</title></head>
<body style=\"font-family: Arial, sans-serif; color: #1f2937; background:#f9fafb; margin:0; padding:24px;\">
  <table role=\"presentation\" width=\"100%\" style=\"max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);overflow:hidden;\">
    <tr><td style=\"padding:32px;\">
      <h1 style=\"margin:0 0 16px 0;color:#b91c1c;\">Reserva rechazada</h1>
      <p style=\"margin:0 0 16px 0;\">Hola <strong>{ctx.full_name}</strong>, lamentamos informarte que tu reserva ha sido rechazada por el alojamiento.</p>
      <table role=\"presentation\" width=\"100%\" style=\"border-collapse:collapse;margin:16px 0;\">
        {reason_row}
        <tr><td style=\"padding:8px 0;color:#6b7280;\">Reembolso</td><td style=\"padding:8px 0;text-align:right;\"><strong>{ctx.refund_percent}%</strong></td></tr>
      </table>
      <p style=\"margin:24px 0 0 0;color:#6b7280;font-size:14px;\">Gracias por usar TravelHub.</p>
    </td></tr>
  </table>
</body>
</html>"""
    return subject, text, html

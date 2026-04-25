from dataclasses import dataclass
from datetime import date
from decimal import Decimal


@dataclass
class BookingConfirmedContext:
    full_name: str
    property_name: str
    city_name: str
    country: str
    checkin: date
    checkout: date
    guests_count: int
    total_amount: Decimal
    currency_code: str
    property_image_url: str | None = None


def _fmt_date(d: date) -> str:
    return d.strftime("%d/%m/%Y")


def render_booking_confirmed(ctx: BookingConfirmedContext) -> tuple[str, str, str]:
    """Return (subject, text_body, html_body) for the booking confirmation email."""
    nights = (ctx.checkout - ctx.checkin).days
    subject = f"Reserva confirmada en {ctx.property_name}"
    total_formatted = f"{ctx.total_amount} {ctx.currency_code}"

    text = f"""Hola {ctx.full_name},

¡Tu reserva está confirmada!

Hotel: {ctx.property_name}
Ciudad: {ctx.city_name}, {ctx.country}
Check-in: {_fmt_date(ctx.checkin)}
Check-out: {_fmt_date(ctx.checkout)}
Noches: {nights}
Huéspedes: {ctx.guests_count}
Total: {total_formatted}

Gracias por reservar con TravelHub.
"""

    hero_html = (
        f'<img src="{ctx.property_image_url}" alt="{ctx.property_name}" '
        'style="display:block;width:100%;max-width:560px;height:auto;border-radius:8px 8px 0 0;" />'
        if ctx.property_image_url
        else ""
    )

    html = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>{subject}</title></head>
<body style="font-family: Arial, sans-serif; color: #1f2937; background:#f9fafb; margin:0; padding:24px;">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);overflow:hidden;">
    <tr><td style="padding:0;">{hero_html}</td></tr>
    <tr><td style="padding:32px;">
      <h1 style="margin:0 0 16px 0;color:#0f172a;">¡Reserva confirmada!</h1>
      <p style="margin:0 0 16px 0;">Hola <strong>{ctx.full_name}</strong>, tu estancia ha sido confirmada por el alojamiento.</p>
      <table role="presentation" width="100%" style="border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 0;color:#6b7280;">Hotel</td><td style="padding:8px 0;text-align:right;"><strong>{ctx.property_name}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Ciudad</td><td style="padding:8px 0;text-align:right;">{ctx.city_name}, {ctx.country}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Check-in</td><td style="padding:8px 0;text-align:right;">{_fmt_date(ctx.checkin)}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Check-out</td><td style="padding:8px 0;text-align:right;">{_fmt_date(ctx.checkout)}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Noches</td><td style="padding:8px 0;text-align:right;">{nights}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Huéspedes</td><td style="padding:8px 0;text-align:right;">{ctx.guests_count}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Total</td><td style="padding:8px 0;text-align:right;"><strong>{total_formatted}</strong></td></tr>
      </table>
      <p style="margin:24px 0 0 0;color:#6b7280;font-size:14px;">Gracias por reservar con TravelHub.</p>
    </td></tr>
  </table>
</body>
</html>"""
    return subject, text, html

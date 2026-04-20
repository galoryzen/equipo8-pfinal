// Servicio para confirmar reserva
export async function confirmBooking(bookingId: string, notes: string) {
  const res = await fetch(`/api/bookings/${bookingId}/confirm`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'booking.confirm_error');
  }
  return res.json();
}

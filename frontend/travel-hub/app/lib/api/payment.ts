import { API_URL } from '@/app/lib/api/constants';
import { PaymentIntentResult } from '@/app/lib/types/payment';

async function readErrorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  if (body && typeof body === 'object' && 'message' in body) {
    return String((body as { message: unknown }).message);
  }
  return `Error ${res.status}`;
}

export async function createPaymentIntent(bookingId: string): Promise<PaymentIntentResult> {
  const res = await fetch(`${API_URL}/api/v1/payment/payment-intents`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ booking_id: bookingId }),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json();
}

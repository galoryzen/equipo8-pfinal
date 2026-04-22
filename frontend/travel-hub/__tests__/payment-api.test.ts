import { createPaymentIntent } from '@/app/lib/api/payment';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => vi.restoreAllMocks());

const INTENT = {
  payment_intent_id: 'pi_123',
  mock_payment_token: 'tok_abc',
  amount: '335.00',
  currency_code: 'USD',
  webhook_signing_secret: 'whsec_xyz',
};

describe('createPaymentIntent', () => {
  it('returns intent on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(INTENT),
    } as Response);

    const res = await createPaymentIntent('booking-1');
    expect(res.payment_intent_id).toBe('pi_123');
  });

  it('throws with message field on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ message: 'Booking not found' }),
    } as Response);

    await expect(createPaymentIntent('bad-id')).rejects.toThrow('Booking not found');
  });

  it('throws generic error when body has no message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    } as Response);

    await expect(createPaymentIntent('bad-id')).rejects.toThrow('Error 500');
  });

  it('throws generic error when body parse fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.reject(new Error('parse fail')),
    } as unknown as Response);

    await expect(createPaymentIntent('bad-id')).rejects.toThrow('Error 503');
  });
});

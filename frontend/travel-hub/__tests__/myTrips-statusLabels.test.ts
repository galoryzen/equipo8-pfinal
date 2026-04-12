import { getBookingStatusPresentation, statusChipProps } from '@/app/lib/myTrips/statusLabels';
import { describe, expect, it } from 'vitest';

describe('getBookingStatusPresentation', () => {
  it.each([
    ['CONFIRMED', 'Confirmed', 'success'],
    ['PENDING_PAYMENT', 'Payment pending', 'warning'],
    ['PENDING_CONFIRMATION', 'Pending confirmation', 'warning'],
    ['CART', 'Cart', 'default'],
    ['CANCELLED', 'Cancelled', 'default'],
    ['REJECTED', 'Rejected', 'error'],
    ['EXPIRED', 'Expired', 'default'],
  ] as const)('maps %s to label %s and color %s', (status, label, color) => {
    const p = getBookingStatusPresentation(status);
    expect(p.label).toBe(label);
    expect(p.color).toBe(color);
  });

  it('uses humanized status and info color for unknown values', () => {
    const p = getBookingStatusPresentation('FOO_BAR_BAZ');
    expect(p.label).toBe('FOO BAR BAZ');
    expect(p.color).toBe('info');
  });
});

describe('statusChipProps', () => {
  it('returns label and color for MUI Chip', () => {
    const props = statusChipProps('CONFIRMED');
    expect(props).toEqual({ label: 'Confirmed', color: 'success' });
  });
});

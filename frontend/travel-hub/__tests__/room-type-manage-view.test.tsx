import {
  createPromotion,
  deletePromotion,
  getRatePlanCancellationPolicy,
  getRoomTypePromotion,
  updateRatePlanCancellationPolicy,
} from '@/app/lib/api/manager';
import RoomTypeManageView from '@/app/manager/hotels/[id]/RoomTypeManageView';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithI18n } from './test-utils';

vi.mock('@/app/lib/api/manager', () => ({
  getRoomTypePromotion: vi.fn(),
  getRatePlanCancellationPolicy: vi.fn(),
  updateRatePlanCancellationPolicy: vi.fn(),
  createPromotion: vi.fn(),
  deletePromotion: vi.fn(),
}));

const ROOM_WITH_PLAN = {
  id: 'rt-1',
  name: 'Deluxe Suite',
  icon: 'suite' as const,
  available: 2,
  total: 5,
  rate_plan_id: 'rp-1',
};

const ROOM_NO_PLAN = {
  ...ROOM_WITH_PLAN,
  rate_plan_id: null,
};

describe('RoomTypeManageView', () => {
  const onBack = vi.fn();

  beforeEach(() => {
    onBack.mockClear();
    vi.mocked(getRoomTypePromotion).mockResolvedValue(null);
    vi.mocked(getRatePlanCancellationPolicy).mockResolvedValue({
      type: 'FULL',
      refund_percent: null,
      hours_limit: 48,
    });
    vi.mocked(updateRatePlanCancellationPolicy).mockResolvedValue({
      type: 'FULL',
      refund_percent: null,
      hours_limit: 48,
    });
    vi.mocked(createPromotion).mockResolvedValue({
      id: 'promo-new',
      name: 'Summer Sale',
      discount_type: 'PERCENT',
      discount_value: 12,
      start_date: '2026-04-23',
      end_date: '2026-04-24',
      is_active: true,
    });
    vi.mocked(deletePromotion).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders title and loads cancellation policy for rate plan', async () => {
    renderWithI18n(
      <RoomTypeManageView
        hotelId="hotel-1"
        hotelName="Grand Hotel"
        roomType={ROOM_WITH_PLAN}
        onBack={onBack}
      />
    );

    expect(await screen.findByRole('heading', { name: /Manage Room: Deluxe Suite/i })).toBeTruthy();

    await waitFor(() => {
      expect(vi.mocked(getRoomTypePromotion)).toHaveBeenCalledWith('rt-1');
      expect(vi.mocked(getRatePlanCancellationPolicy)).toHaveBeenCalledWith('rp-1');
    });
  });

  it('disables save when room type has no rate plan', async () => {
    renderWithI18n(
      <RoomTypeManageView
        hotelId="hotel-1"
        hotelName="Grand Hotel"
        roomType={ROOM_NO_PLAN}
        onBack={onBack}
      />
    );

    await screen.findByRole('heading', { name: /Manage Room: Deluxe Suite/i });
    await waitFor(() => expect(vi.mocked(getRoomTypePromotion)).toHaveBeenCalled());
    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    expect((saveBtn as HTMLButtonElement).disabled).toBe(true);
    expect(saveBtn.getAttribute('title')).toMatch(/No rate plan available/i);
  });

  it('shows name validation error when saving with empty promotion name', async () => {
    const user = userEvent.setup();
    renderWithI18n(
      <RoomTypeManageView
        hotelId="hotel-1"
        hotelName="Grand Hotel"
        roomType={ROOM_WITH_PLAN}
        onBack={onBack}
      />
    );

    await screen.findByRole('heading', { name: /Manage Room: Deluxe Suite/i });

    const discountInput = await screen.findByRole('spinbutton', { name: /Discount to Apply/i });
    await user.clear(discountInput);
    await user.type(discountInput, '10');

    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    expect(await screen.findByText(/Promotion name is required/i)).toBeTruthy();
    expect(vi.mocked(updateRatePlanCancellationPolicy)).not.toHaveBeenCalled();
    expect(vi.mocked(createPromotion)).not.toHaveBeenCalled();
  });

  it('saves promotion and policy then calls onBack', async () => {
    const user = userEvent.setup();
    renderWithI18n(
      <RoomTypeManageView
        hotelId="hotel-1"
        hotelName="Grand Hotel"
        roomType={ROOM_WITH_PLAN}
        onBack={onBack}
      />
    );

    await screen.findByRole('heading', { name: /Manage Room: Deluxe Suite/i });

    const nameInput = screen.getByPlaceholderText('Deluxe Suite');
    await user.clear(nameInput);
    await user.type(nameInput, 'Summer Sale');

    const discountInput = screen.getByRole('spinbutton', { name: /Discount to Apply/i });
    await user.clear(discountInput);
    await user.type(discountInput, '12');

    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(vi.mocked(updateRatePlanCancellationPolicy)).toHaveBeenCalledWith('rp-1', {
        type: 'FULL',
      });
      expect(vi.mocked(createPromotion)).toHaveBeenCalledWith(
        'hotel-1',
        expect.objectContaining({
          rate_plan_id: 'rp-1',
          name: 'Summer Sale',
          discount_type: 'PERCENT',
          discount_value: 12,
        })
      );
      expect(onBack).toHaveBeenCalled();
    });
  });

  it('shows delete promotion and removes it on success', async () => {
    const user = userEvent.setup();
    vi.mocked(getRoomTypePromotion).mockResolvedValue({
      id: 'promo-1',
      rate_plan_id: 'rp-1',
      name: 'Existing',
      discount_type: 'PERCENT',
      discount_value: 8,
      start_date: '2026-01-01',
      end_date: '2026-01-31',
      is_active: true,
    });

    renderWithI18n(
      <RoomTypeManageView
        hotelId="hotel-1"
        hotelName="Grand Hotel"
        roomType={ROOM_WITH_PLAN}
        onBack={onBack}
      />
    );

    await screen.findByRole('heading', { name: /Manage Room: Deluxe Suite/i });

    const deleteBtn = await screen.findByRole('button', { name: /Delete Promotion/i });
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(vi.mocked(deletePromotion)).toHaveBeenCalledWith('promo-1');
    });

    expect(await screen.findByText(/Promotion deleted successfully/i)).toBeTruthy();
  });

  it('surfaces delete errors in a snackbar', async () => {
    const user = userEvent.setup();
    vi.mocked(getRoomTypePromotion).mockResolvedValue({
      id: 'promo-1',
      rate_plan_id: 'rp-1',
      name: 'Existing',
      discount_type: 'PERCENT',
      discount_value: 8,
      start_date: '2026-01-01',
      end_date: '2026-01-31',
      is_active: true,
    });
    vi.mocked(deletePromotion).mockRejectedValueOnce(new Error('Cannot delete'));

    renderWithI18n(
      <RoomTypeManageView
        hotelId="hotel-1"
        hotelName="Grand Hotel"
        roomType={ROOM_WITH_PLAN}
        onBack={onBack}
      />
    );

    await screen.findByRole('heading', { name: /Manage Room: Deluxe Suite/i });

    await user.click(await screen.findByRole('button', { name: /Delete Promotion/i }));

    expect(await screen.findByText('Cannot delete')).toBeTruthy();
  });
});

import { ManagerSettingsHotelSelect } from '@/app/manager/settings/ManagerSettingsHotelSelect';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

describe('ManagerSettingsHotelSelect', () => {
  const hotels = [
    { id: 'h1', name: 'Hotel One' },
    { id: 'h2', name: 'Hotel Two' },
  ];

  it('renders the section label and current hotel in the select', () => {
    render(
      <ManagerSettingsHotelSelect
        hotels={hotels}
        value="h1"
        sectionLabel="Settings"
        selectAriaLabel="Choose hotel"
        onHotelChange={vi.fn()}
      />
    );

    expect(screen.getByText('Settings')).toBeTruthy();
    const select = screen.getByRole('combobox', { name: /choose hotel/i });
    expect(select.textContent).toMatch(/Hotel One/i);
  });

  it('opens the menu and calls onHotelChange when another hotel is chosen', async () => {
    const user = userEvent.setup();
    const onHotelChange = vi.fn();

    render(
      <ManagerSettingsHotelSelect
        hotels={hotels}
        value="h1"
        sectionLabel="Settings"
        selectAriaLabel="Choose hotel"
        onHotelChange={onHotelChange}
      />
    );

    await user.click(screen.getByRole('combobox', { name: /choose hotel/i }));
    await user.click(screen.getByRole('option', { name: 'Hotel Two' }));

    expect(onHotelChange).toHaveBeenCalledTimes(1);
    expect(onHotelChange).toHaveBeenCalledWith('h2');
  });

  it('does not call onHotelChange when selecting the hotel that is already selected', async () => {
    const user = userEvent.setup();
    const onHotelChange = vi.fn();

    render(
      <ManagerSettingsHotelSelect
        hotels={hotels}
        value="h1"
        sectionLabel="Settings"
        selectAriaLabel="Choose hotel"
        onHotelChange={onHotelChange}
      />
    );

    await user.click(screen.getByRole('combobox', { name: /choose hotel/i }));
    await user.click(screen.getByRole('option', { name: 'Hotel One' }));

    expect(onHotelChange).not.toHaveBeenCalled();
  });
});

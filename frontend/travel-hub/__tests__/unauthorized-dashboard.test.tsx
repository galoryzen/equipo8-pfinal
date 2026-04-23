import UnauthorizedDashboard from '@/app/manager/components/UnauthorizedDashboard';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      (
        ({
          'manager.dashboard.errors.unauthorizedTitle': 'Acceso restringido',
          'manager.dashboard.errors.unauthorized':
            'No tienes permisos para consultar este dashboard.',
          'manager.dashboard.actions.goToBookings': 'Ir a reservas',
        }) as Record<string, string>
      )[key] ?? key,
  }),
}));

describe('UnauthorizedDashboard', () => {
  it('renders restricted access texts', () => {
    render(<UnauthorizedDashboard />);

    expect(screen.getByText('Acceso restringido')).toBeTruthy();
    expect(screen.getByText('No tienes permisos para consultar este dashboard.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ir a reservas' })).toBeTruthy();
  });
});

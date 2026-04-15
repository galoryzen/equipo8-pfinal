import LoginPage from '@/app/(auth)/login/traveler/page';
import * as authApi from '@/app/lib/api/auth';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock('@/app/lib/api/auth', () => ({
  loginUser: vi.fn(),
}));

const mockLogin = vi.mocked(authApi.loginUser);

describe('Traveler Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with email, password fields and submit button', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/email address/i)).toBeTruthy();
    expect(screen.getByLabelText(/^password$/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /continue/i })).toBeTruthy();
  });

  it('shows the "Create Account" link', () => {
    render(<LoginPage />);

    expect(screen.getByText(/create account/i)).toBeTruthy();
  });

  it('has the submit button disabled when the form is empty', () => {
    render(<LoginPage />);

    const button = screen.getByRole('button', { name: /continue/i });
    expect(button).toHaveProperty('disabled', true);
  });

  it('keeps the submit button disabled while the email is invalid', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), 'not-an-email');
    await user.type(screen.getByLabelText(/^password$/i), 'secret123');

    expect(screen.getByRole('button', { name: /continue/i })).toHaveProperty('disabled', true);
  });

  it('enables the submit button when both fields are validly filled', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'secret123');

    expect(screen.getByRole('button', { name: /continue/i })).toHaveProperty('disabled', false);
  });

  it('shows an inline error after blurring the email field with an invalid value', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'bad-email');
    await user.tab();

    expect(screen.getByText(/valid email/i)).toBeTruthy();
  });

  it('toggles password visibility when the eye icon is clicked', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput).toHaveProperty('type', 'password');

    await user.click(screen.getByLabelText(/show password/i));
    expect(passwordInput).toHaveProperty('type', 'text');

    await user.click(screen.getByLabelText(/hide password/i));
    expect(passwordInput).toHaveProperty('type', 'password');
  });

  it('shows a success toast and redirects on successful login', async () => {
    mockLogin.mockResolvedValue({ id: '1', email: 'user@example.com', role: 'traveler' });

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeTruthy();
    });
  });

  it('shows an error toast when the API returns an error', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/the email or password is not valid. please try again./i)
      ).toBeTruthy();
    });
  });

  it('shows a loading indicator while the request is in flight', async () => {
    mockLogin.mockImplementation(() => new Promise(() => {})); // never resolves

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/signing in/i)).toBeTruthy();
    });
  });

  it('closes the snackbar when the Alert close button is clicked', async () => {
    mockLogin.mockRejectedValue(new Error('fail'));

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/the email or password is not valid/i)).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: /close/i }));
  });
});

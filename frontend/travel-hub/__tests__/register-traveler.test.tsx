import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RegisterPage from '@/app/(auth)/register/traveler/page';
import * as authApi from '@/app/lib/api/auth';

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

vi.mock('@/app/lib/api/auth', () => ({
  registerUser: vi.fn(),
}));

const mockRegister = vi.mocked(authApi.registerUser);

/** Types into every required field with valid values. */
async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/email address/i), 'new@example.com');
  await user.type(screen.getByLabelText(/username/i), 'john_doe');
  await user.type(screen.getByLabelText(/cellphone/i), '5551234567');
  await user.type(screen.getByLabelText(/password/i), 'mypassword');
}

describe('Traveler Register page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields and the submit button', () => {
    render(<RegisterPage />);

    expect(screen.getByLabelText(/email address/i)).toBeTruthy();
    expect(screen.getByLabelText(/username/i)).toBeTruthy();
    expect(screen.getByLabelText(/cellphone/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /create account/i })).toBeTruthy();
  });

  it('shows the "Back to Login" link', () => {
    render(<RegisterPage />);

    expect(screen.getByText(/back to login/i)).toBeTruthy();
  });

  it('has the submit button disabled when the form is empty', () => {
    render(<RegisterPage />);

    expect(screen.getByRole('button', { name: /create account/i })).toHaveProperty('disabled', true);
  });

  it('keeps the submit button disabled while any field is missing', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/email address/i), 'new@example.com');
    await user.type(screen.getByLabelText(/username/i), 'john_doe');
    // phone and password left empty

    expect(screen.getByRole('button', { name: /create account/i })).toHaveProperty('disabled', true);
  });

  it('enables the submit button once all fields are filled correctly', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await fillForm(user);

    expect(screen.getByRole('button', { name: /create account/i })).toHaveProperty('disabled', false);
  });

  it('shows an inline error for an invalid email after blurring', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/email address/i), 'not-an-email');
    await user.tab();

    expect(screen.getByText(/valid email/i)).toBeTruthy();
  });

  it('shows a required error for each field when touched and left empty', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.click(screen.getByLabelText(/email address/i));
    await user.tab();
    expect(screen.getByText(/email is required/i)).toBeTruthy();

    await user.click(screen.getByLabelText(/username/i));
    await user.tab();
    expect(screen.getByText(/username is required/i)).toBeTruthy();

    await user.click(screen.getByLabelText(/cellphone/i));
    await user.tab();
    expect(screen.getByText(/phone number is required/i)).toBeTruthy();

    await user.click(screen.getByLabelText(/^password$/i));
    await user.tab();
    expect(screen.getByText(/password is required/i)).toBeTruthy();
  });

  it('shows a success toast and redirects on successful registration', async () => {
    mockRegister.mockResolvedValue({ id: '1', email: 'new@example.com', role: 'traveler' });

    const user = userEvent.setup();
    render(<RegisterPage />);

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/account created/i)).toBeTruthy();
    });
  });

  it('shows an error toast when the API rejects the request', async () => {
    mockRegister.mockRejectedValue(new Error('Email already registered'));

    const user = userEvent.setup();
    render(<RegisterPage />);

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/email already registered/i)).toBeTruthy();
    });
  });

  it('shows a loading indicator while the request is in flight', async () => {
    mockRegister.mockImplementation(() => new Promise(() => {})); // never resolves

    const user = userEvent.setup();
    render(<RegisterPage />);

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/creating account/i)).toBeTruthy();
    });
  });
});

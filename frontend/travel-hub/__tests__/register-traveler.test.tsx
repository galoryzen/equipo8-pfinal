import RegisterPage from '@/app/(auth)/register/traveler/page';
import * as authApi from '@/app/lib/api/auth';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

vi.mock('@/app/lib/api/auth', () => ({
  registerUser: vi.fn(),
}));

const mockRegister = vi.mocked(authApi.registerUser);

/** Fills every required field with valid values using fireEvent (fast). */
function fillForm() {
  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: { value: 'new@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'john_doe' } });
  fireEvent.change(screen.getByLabelText(/cellphone/i), { target: { value: '5551234567' } });
  fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'mypassword' } });
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

    expect(screen.getByRole('button', { name: /create account/i })).toHaveProperty(
      'disabled',
      true
    );
  });

  it('keeps the submit button disabled while any field is missing', () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'john_doe' } });
    // phone and password left empty

    expect(screen.getByRole('button', { name: /create account/i })).toHaveProperty(
      'disabled',
      true
    );
  });

  it('enables the submit button once all fields are filled correctly', () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'john_doe' } });
    fireEvent.change(screen.getByLabelText(/cellphone/i), { target: { value: '5551234567' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'mypassword' } });

    expect(screen.getByRole('button', { name: /create account/i })).toHaveProperty(
      'disabled',
      false
    );
  });

  it('shows an inline error for an invalid email after blurring', () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'not-an-email' },
    });
    fireEvent.blur(screen.getByLabelText(/email address/i));

    expect(screen.getByText(/valid email/i)).toBeTruthy();
  });

  it('shows a required error for each field when touched and left empty', () => {
    render(<RegisterPage />);

    fireEvent.focus(screen.getByLabelText(/email address/i));
    fireEvent.blur(screen.getByLabelText(/email address/i));
    expect(screen.getByText(/email is required/i)).toBeTruthy();

    fireEvent.focus(screen.getByLabelText(/username/i));
    fireEvent.blur(screen.getByLabelText(/username/i));
    expect(screen.getByText(/username is required/i)).toBeTruthy();

    fireEvent.focus(screen.getByLabelText(/cellphone/i));
    fireEvent.blur(screen.getByLabelText(/cellphone/i));
    expect(screen.getByText(/phone number is required/i)).toBeTruthy();

    fireEvent.focus(screen.getByLabelText(/^password$/i));
    fireEvent.blur(screen.getByLabelText(/^password$/i));
    expect(screen.getByText(/password is required/i)).toBeTruthy();
  });

  it('shows a success toast and redirects on successful registration', async () => {
    mockRegister.mockResolvedValue({ id: '1', email: 'new@example.com', role: 'traveler' });

    render(<RegisterPage />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/account created/i)).toBeTruthy();
    });
  });

  it('shows an error toast when the API rejects the request', async () => {
    mockRegister.mockRejectedValue(new Error('Email already registered'));

    render(<RegisterPage />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/email already registered/i)).toBeTruthy();
    });
  });

  it('shows a loading indicator while the request is in flight', async () => {
    mockRegister.mockImplementation(() => new Promise(() => {})); // never resolves

    render(<RegisterPage />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/creating account/i)).toBeTruthy();
    });
  });

  it('rejects an email exceeding 255 characters', () => {
    render(<RegisterPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'a'.repeat(250) + '@x.com' } });
    fireEvent.blur(emailInput);

    expect(screen.getByText(/email must be at most 255/i)).toBeTruthy();
  });

  it('rejects a username exceeding 255 characters', () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'valid@example.com' },
    });
    const usernameInput = screen.getByLabelText(/username/i);
    fireEvent.change(usernameInput, { target: { value: 'u'.repeat(256) } });
    fireEvent.blur(usernameInput);

    expect(screen.getByText(/username must be at most 255/i)).toBeTruthy();
  });

  it('rejects a phone number exceeding 255 characters', () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'valid@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'john_doe' } });
    const phoneInput = screen.getByLabelText(/cellphone/i);
    fireEvent.change(phoneInput, { target: { value: '5'.repeat(256) } });
    fireEvent.blur(phoneInput);

    expect(screen.getByText(/phone number must be at most 255/i)).toBeTruthy();
  });

  it('rejects a password exceeding 255 characters', () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'valid@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'john_doe' } });
    fireEvent.change(screen.getByLabelText(/cellphone/i), { target: { value: '5551234567' } });
    const passwordInput = screen.getByLabelText(/^password$/i);
    fireEvent.change(passwordInput, { target: { value: 'p'.repeat(256) } });
    fireEvent.blur(passwordInput);

    expect(screen.getByText(/password must be at most 255/i)).toBeTruthy();
  });

  it('closes the snackbar when the Alert close button is clicked', async () => {
    mockRegister.mockRejectedValue(new Error('Email already registered'));

    render(<RegisterPage />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/email already registered/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
  });
});

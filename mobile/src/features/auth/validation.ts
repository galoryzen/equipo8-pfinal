import type { TFunction } from 'i18next';

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const MIN_PASSWORD_LENGTH = 8;

export type AuthMode = 'login' | 'signup';

export interface AuthFormValues {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  countryCode: string;
}

export type AuthFieldErrors = Partial<
  Record<'email' | 'password' | 'fullName' | 'phone' | 'country', string>
>;

export function validateAuthForm(
  values: AuthFormValues,
  mode: AuthMode,
  t: TFunction,
): AuthFieldErrors {
  const errors: AuthFieldErrors = {};

  if (!values.email) {
    errors.email = t('profile.validation.emailRequired');
  } else if (!EMAIL_REGEX.test(values.email)) {
    errors.email = t('profile.validation.emailInvalid');
  }

  if (!values.password) {
    errors.password = t('profile.validation.passwordRequired');
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = t('profile.validation.passwordTooShort');
  }

  if (mode === 'signup') {
    if (!values.fullName.trim()) {
      errors.fullName = t('profile.validation.fullNameRequired');
    }
    if (!values.phone.trim()) {
      errors.phone = t('profile.validation.phoneRequired');
    }
    if (!values.countryCode) {
      errors.country = t('profile.validation.countryRequired');
    }
  }

  return errors;
}

export function hasErrors(errors: AuthFieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}

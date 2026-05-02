import {
  EMAIL_REGEX,
  MIN_PASSWORD_LENGTH,
  hasErrors,
  validateAuthForm,
  type AuthFormValues,
} from '@src/features/auth/validation';

const t = ((key: string) => key) as unknown as Parameters<typeof validateAuthForm>[2];

const baseValues: AuthFormValues = {
  email: 'a@b.com',
  password: 'password123',
  fullName: 'Carlos García',
  phone: '+573001112233',
  countryCode: 'CO',
};

describe('EMAIL_REGEX', () => {
  it.each([
    'a@b.co',
    'first.last@example.com',
    'user+tag@example.io',
    'A1@B2.org',
  ])('accepts %s', (value) => {
    expect(EMAIL_REGEX.test(value)).toBe(true);
  });

  it.each([
    '',
    'plain',
    'a@',
    '@b.com',
    'a@b',
    'a b@c.com',
    'a@b.c',
  ])('rejects %s', (value) => {
    expect(EMAIL_REGEX.test(value)).toBe(false);
  });
});

describe('validateAuthForm — login mode', () => {
  it('returns no errors for a valid login form', () => {
    expect(validateAuthForm(baseValues, 'login', t)).toEqual({});
  });

  it('flags missing email', () => {
    const errs = validateAuthForm({ ...baseValues, email: '' }, 'login', t);
    expect(errs.email).toBe('profile.validation.emailRequired');
  });

  it('flags malformed email', () => {
    const errs = validateAuthForm({ ...baseValues, email: 'not-an-email' }, 'login', t);
    expect(errs.email).toBe('profile.validation.emailInvalid');
  });

  it('flags missing password', () => {
    const errs = validateAuthForm({ ...baseValues, password: '' }, 'login', t);
    expect(errs.password).toBe('profile.validation.passwordRequired');
  });

  it(`flags passwords shorter than ${MIN_PASSWORD_LENGTH} chars`, () => {
    const errs = validateAuthForm({ ...baseValues, password: 'short' }, 'login', t);
    expect(errs.password).toBe('profile.validation.passwordTooShort');
  });

  it('does not require fullName/phone/country in login mode', () => {
    const errs = validateAuthForm(
      { ...baseValues, fullName: '', phone: '', countryCode: '' },
      'login',
      t,
    );
    expect(errs.fullName).toBeUndefined();
    expect(errs.phone).toBeUndefined();
    expect(errs.country).toBeUndefined();
  });
});

describe('validateAuthForm — signup mode', () => {
  it('returns no errors for a complete signup form', () => {
    expect(validateAuthForm(baseValues, 'signup', t)).toEqual({});
  });

  it('flags missing fullName (whitespace counts as empty)', () => {
    const errs = validateAuthForm({ ...baseValues, fullName: '   ' }, 'signup', t);
    expect(errs.fullName).toBe('profile.validation.fullNameRequired');
  });

  it('flags missing phone', () => {
    const errs = validateAuthForm({ ...baseValues, phone: '' }, 'signup', t);
    expect(errs.phone).toBe('profile.validation.phoneRequired');
  });

  it('flags missing country code', () => {
    const errs = validateAuthForm({ ...baseValues, countryCode: '' }, 'signup', t);
    expect(errs.country).toBe('profile.validation.countryRequired');
  });

  it('aggregates multiple errors at once', () => {
    const errs = validateAuthForm(
      { email: '', password: '', fullName: '', phone: '', countryCode: '' },
      'signup',
      t,
    );
    expect(Object.keys(errs).sort()).toEqual(['country', 'email', 'fullName', 'password', 'phone']);
  });
});

describe('hasErrors', () => {
  it('returns false for an empty errors object', () => {
    expect(hasErrors({})).toBe(false);
  });

  it('returns false when all entries are undefined', () => {
    expect(hasErrors({ email: undefined, password: undefined })).toBe(false);
  });

  it('returns true when any entry has a message', () => {
    expect(hasErrors({ email: 'oops' })).toBe(true);
  });
});

'use client';

import { Suspense, useState } from 'react';

import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { loginUser } from '@/app/lib/api/auth';
import { tokens as th } from '@/lib/theme/tokens';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MuiLink from '@mui/material/Link';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

interface FormValues {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.email) {
    errors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(values.email)) {
    errors.email = 'Enter a valid email address';
  }
  if (!values.password) {
    errors.password = 'Password is required';
  }
  return errors;
}

type SnackbarState = { open: boolean; message: string; severity: 'success' | 'error' };

function inputSx(hasError: boolean) {
  return {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      height: '48px',
      bgcolor: th.surface.muted,
      '& fieldset': { borderColor: hasError ? th.state.error : th.border.default },
      '&:hover fieldset': { borderColor: hasError ? th.state.error : th.border.inputHover },
      '&.Mui-focused fieldset': {
        borderColor: hasError ? th.state.error : th.brand.primary,
        borderWidth: 2,
      },
      '&.Mui-error fieldset': { borderColor: th.state.error },
    },
    '& .MuiInputBase-input': {
      fontSize: '14px',
      color: th.ink.charcoal,
      '&::placeholder': { color: th.text.muted, opacity: 1 },
    },
    '& .MuiFormHelperText-root': { mx: 0, mt: '4px', fontSize: '12px' },
  };
}

function TravelerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/';
  const { t } = useTranslation();

  const [values, setValues] = useState<FormValues>({ email: '', password: '' });
  const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const errors = validate(values);
  const formIsInvalid = Object.keys(errors).length > 0;

  function handleChange(field: keyof FormValues) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleBlur(field: keyof FormValues) {
    return () => setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function closeSnackbar() {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (formIsInvalid) return;

    setLoading(true);
    try {
      await loginUser(values.email, values.password);
      setSnackbar({ open: true, message: 'Welcome back! Redirecting…', severity: 'success' });
      // Use a full navigation so all components remount and re-read the session cookie.
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 1200);
    } catch {
      setSnackbar({
        open: true,
        message: 'The email or password is not valid. Please try again.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-th-surface-page-cool flex flex-col items-center justify-center px-4 py-[100px] min-h-screen">
      <Box maxWidth={448} width="100%" display="flex" flexDirection="column" gap={3}>
        {/* Card */}
        <Box
          sx={{
            bgcolor: 'white',
            border: `1px solid ${th.surface.pageCool}`,
            borderRadius: '16px',
            boxShadow: '0px 20px 25px -5px rgba(0,0,0,0.1), 0px 8px 10px -6px rgba(0,0,0,0.1)',
            width: '100%',
          }}
        >
          {/* Header */}
          <Box px={5} pt={5} display="flex" flexDirection="column" alignItems="center">
            <Box
              sx={{
                bgcolor: 'rgba(14,165,233,0.1)',
                borderRadius: '9999px',
                width: 48,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <LockOutlinedIcon sx={{ color: 'primary.main', fontSize: 22 }} />
            </Box>

            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                fontSize: '24px',
                color: 'text.primary',
                lineHeight: '32px',
                textAlign: 'center',
              }}
            >
              Welcome to your next stay
            </Typography>
            <Typography
              sx={{
                color: 'text.secondary',
                fontSize: '14px',
                lineHeight: '20px',
                textAlign: 'center',
                mt: 0.5,
                mb: 3,
              }}
            >
              Plan your dream getaway with TravelHub.
            </Typography>
          </Box>

          {/* Form */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            px={5}
            pb={5}
            display="flex"
            flexDirection="column"
            gap={2.5}
          >
            {/* Email */}
            <Box>
              <Typography
                component="label"
                htmlFor="email"
                sx={{
                  fontWeight: 500,
                  fontSize: '12px',
                  color: 'text.secondary',
                  display: 'block',
                  mb: '4px',
                }}
              >
                Email address
              </Typography>
              <TextField
                id="email"
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                fullWidth
                value={values.email}
                onChange={handleChange('email')}
                onBlur={handleBlur('email')}
                error={!!(touched.email && errors.email)}
                helperText={touched.email ? errors.email : undefined}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <MailOutlineIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={inputSx(!!(touched.email && errors.email))}
              />
            </Box>

            {/* Password */}
            <Box>
              <Typography
                component="label"
                htmlFor="password"
                sx={{
                  fontWeight: 500,
                  fontSize: '12px',
                  color: 'text.secondary',
                  display: 'block',
                  mb: '4px',
                }}
              >
                Password
              </Typography>
              <TextField
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                fullWidth
                value={values.password}
                onChange={handleChange('password')}
                onBlur={handleBlur('password')}
                error={!!(touched.password && errors.password)}
                helperText={touched.password ? errors.password : undefined}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon sx={{ color: 'text.secondary', fontSize: 15 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowPassword((v) => !v)}
                          edge="end"
                          size="small"
                          tabIndex={-1}
                          sx={{ color: 'text.secondary', mr: '-4px' }}
                        >
                          {showPassword ? (
                            <VisibilityIcon sx={{ fontSize: 17 }} />
                          ) : (
                            <VisibilityOffIcon sx={{ fontSize: 17 }} />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={inputSx(!!(touched.password && errors.password))}
              />
            </Box>

            {/* Submit */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading || formIsInvalid}
              endIcon={!loading && <ArrowForwardIcon sx={{ fontSize: '16px !important' }} />}
              sx={{
                height: 52,
                borderRadius: '12px',
                bgcolor: 'primary.main',
                fontWeight: 600,
                fontSize: '16px',
                textTransform: 'none',
                letterSpacing: 0,
                boxShadow:
                  '0px 10px 15px -3px rgba(14,165,233,0.3), 0px 4px 6px -4px rgba(14,165,233,0.3)',
                '&:hover': { bgcolor: th.brand.primaryHover, boxShadow: 'none' },
                '&:active': { bgcolor: th.brand.primaryActive },
                '&.Mui-disabled': { bgcolor: 'primary.main', color: 'white', opacity: 0.6 },
              }}
            >
              {loading ? (
                <Box display="flex" alignItems="center" gap={1}>
                  <CircularProgress
                    aria-label={t('a11y.loading')}
                    size={18}
                    sx={{ color: 'white' }}
                  />
                  <span>Signing in…</span>
                </Box>
              ) : (
                'Continue'
              )}
            </Button>

            {/* Create account link */}
            <Box textAlign="center">
              <MuiLink
                component={NextLink}
                href="/register/traveler"
                underline="none"
                sx={{ color: 'text.secondary', fontSize: '14px' }}
              >
                Don&apos;t have an account?{' '}
                <Box component="span" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                  Create Account
                </Box>
              </MuiLink>
            </Box>

            {/* Security badge + Terms */}
            <Box display="flex" flexDirection="column" gap={1.5} mt={0.5}>
              <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                <LockOutlinedIcon sx={{ color: '#16a34a', fontSize: 14 }} />
                <Typography sx={{ color: '#16a34a', fontSize: '12px', fontWeight: 500 }}>
                  Your data is secured with 256-bit encryption
                </Typography>
              </Box>
              <Typography
                sx={{
                  color: 'text.secondary',
                  fontSize: '12px',
                  textAlign: 'center',
                  lineHeight: '19.5px',
                }}
              >
                By signing up, you agree to our{' '}
                <MuiLink
                  component={NextLink}
                  href="#"
                  underline="always"
                  sx={{
                    color: 'text.primary',
                    fontSize: '12px',
                    textDecorationColor: 'rgba(14,165,233,0.3)',
                  }}
                >
                  Terms of Service
                </MuiLink>
                {' & '}
                <MuiLink
                  component={NextLink}
                  href="#"
                  underline="always"
                  sx={{
                    color: 'text.primary',
                    fontSize: '12px',
                    textDecorationColor: 'rgba(14,165,233,0.3)',
                  }}
                >
                  Privacy Policy
                </MuiLink>
                .
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%', borderRadius: '12px' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default function TravelerLoginPage() {
  return (
    <Suspense>
      <TravelerLoginForm />
    </Suspense>
  );
}

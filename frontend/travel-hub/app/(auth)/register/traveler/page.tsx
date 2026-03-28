'use client';

import { useState } from 'react';

import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputAdornment from '@mui/material/InputAdornment';
import MuiLink from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';

import { registerUser } from '@/app/lib/api/auth';

const HERO_IMAGE = 'https://www.figma.com/api/mcp/asset/d667e649-301a-4522-9381-336988f5a181';
const LOGO_IMAGE = 'https://www.figma.com/api/mcp/asset/c71e5652-b605-499c-80d4-8ea1d2860418';

const COUNTRY_CODES = [
  { code: 'MX', dial: '+52', flag: '🇲🇽' },
  { code: 'CO', dial: '+57', flag: '🇨🇴' },
  { code: 'AR', dial: '+54', flag: '🇦🇷' },
  { code: 'CL', dial: '+56', flag: '🇨🇱' },
  { code: 'PE', dial: '+51', flag: '🇵🇪' },
  { code: 'BR', dial: '+55', flag: '🇧🇷' },
  { code: 'VE', dial: '+58', flag: '🇻🇪' },
  { code: 'EC', dial: '+593', flag: '🇪🇨' },
  { code: 'BO', dial: '+591', flag: '🇧🇴' },
  { code: 'PY', dial: '+595', flag: '🇵🇾' },
  { code: 'UY', dial: '+598', flag: '🇺🇾' },
  { code: 'CR', dial: '+506', flag: '🇨🇷' },
  { code: 'PA', dial: '+507', flag: '🇵🇦' },
  { code: 'GT', dial: '+502', flag: '🇬🇹' },
  { code: 'US', dial: '+1', flag: '🇺🇸' },
  { code: 'ES', dial: '+34', flag: '🇪🇸' },
];

// Mirrors the backend Pydantic RegisterRequest validators
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

interface FormValues {
  email: string;
  username: string;
  phone: string;
  country_code: string;
  password: string;
}

interface FormErrors {
  email?: string;
  username?: string;
  phone?: string;
  password?: string;
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.email) {
    errors.email = 'Email is required';
  } else if (values.email.length > 255) {
    errors.email = 'Email must be at most 255 characters';
  } else if (!EMAIL_REGEX.test(values.email)) {
    errors.email = 'Enter a valid email address';
  }

  if (!values.username) {
    errors.username = 'Username is required';
  } else if (values.username.length > 255) {
    errors.username = 'Username must be at most 255 characters';
  }

  if (!values.phone) {
    errors.phone = 'Phone number is required';
  } else if (values.phone.length > 255) {
    errors.phone = 'Phone number must be at most 255 characters';
  }

  if (!values.password) {
    errors.password = 'Password is required';
  } else if (values.password.length > 255) {
    errors.password = 'Password must be at most 255 characters';
  }

  return errors;
}

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
};

/** Returns TextField `sx` matching the Figma design, with error/valid border states. */
function fieldSx(isValid: boolean) {
  return {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      height: '48px',
      bgcolor: 'white',
      '& fieldset': { borderColor: isValid ? '#10b981' : '#e2e8f0' },
      '&:hover fieldset': { borderColor: isValid ? '#10b981' : '#cbd5e1' },
      '&.Mui-focused fieldset': {
        borderColor: isValid ? '#10b981' : '#0ea5e9',
        borderWidth: 2,
      },
      '&.Mui-error fieldset': { borderColor: '#f87171' },
      '&.Mui-error.Mui-focused fieldset': { borderColor: '#f87171', borderWidth: 2 },
      '&.Mui-error:hover fieldset': { borderColor: '#f87171' },
    },
    '& .MuiInputBase-input': {
      fontSize: '16px',
      color: '#0f172a',
      py: '14.5px',
      px: '17px',
      '&::placeholder': { color: '#6b7280', opacity: 1 },
    },
    '& .MuiFormHelperText-root': { mx: 0, mt: '4px', fontSize: '12px' },
  };
}

export default function TravelerRegisterPage() {
  const router = useRouter();

  const [values, setValues] = useState<FormValues>({
    email: '',
    username: '',
    phone: '',
    country_code: 'MX',
    password: '',
  });
  const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const errors = validate(values);

  function handleTextField(field: keyof FormValues) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleBlur(field: keyof FormValues) {
    return () => setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function handleCountryChange(e: SelectChangeEvent<string>) {
    setValues((prev) => ({ ...prev, country_code: e.target.value }));
  }

  function closeSnackbar() {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }

  function showSnackbar(message: string, severity: 'success' | 'error') {
    setSnackbar({ open: true, message, severity });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ email: true, username: true, phone: true, password: true });

    if (Object.keys(errors).length > 0) {
      showSnackbar('Please fix the errors in the form before continuing.', 'error');
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        email: values.email,
        username: values.username,
        phone: values.phone,
        country_code: values.country_code,
        password: values.password,
      });
      showSnackbar('Account created successfully! Welcome to TravelHub 🎉', 'success');
      setTimeout(() => router.push('/traveler/search'), 1500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      showSnackbar(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  const emailIsValid = !!(touched.email && !errors.email && values.email);

  return (
    <div className="bg-[#f8f6f6] flex flex-col items-center justify-center px-4 py-10 min-h-screen relative overflow-hidden">
      {/* Background decoration blobs */}
      <div className="absolute inset-0 opacity-10 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute bg-[rgba(14,165,233,0.2)] blur-[32px] h-[410px] right-[-128px] rounded-full top-[-102px] w-[512px]" />
        <div className="absolute bg-[rgba(14,165,233,0.1)] blur-[32px] bottom-[-102px] h-[410px] left-[-128px] rounded-full w-[512px]" />
      </div>

      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        gap={4}
        width="100%"
        maxWidth={448}
        position="relative"
        zIndex={10}
      >
        {/* Logo section */}
        <Box display="flex" flexDirection="column" alignItems="center">
          <Box height={47} width={50} mb={1.5}>
            <img
              alt="TravelHub logo"
              src={LOGO_IMAGE}
              style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </Box>
          <Typography
            variant="h1"
            sx={{
              fontWeight: 900,
              fontSize: '30px',
              color: '#0f172a',
              letterSpacing: '-0.75px',
              lineHeight: '36px',
            }}
          >
            TravelHub
          </Typography>
          <Typography sx={{ color: '#64748b', fontSize: '16px', lineHeight: '24px', mt: 0.5 }}>
            Start your next adventure with us
          </Typography>
        </Box>

        {/* Registration card */}
        <Box
          sx={{
            bgcolor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow:
              '0px 20px 25px -5px rgba(0,0,0,0.1), 0px 8px 10px -6px rgba(0,0,0,0.1)',
            width: '100%',
            overflow: 'hidden',
          }}
        >
          {/* Hero image with gradient fade */}
          <Box height={128} position="relative" overflow="hidden">
            <img
              alt=""
              aria-hidden
              src={HERO_IMAGE}
              style={{
                position: 'absolute',
                width: '100%',
                height: '348%',
                top: '-124%',
                left: 0,
                objectFit: 'cover',
              }}
            />
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              sx={{ background: 'linear-gradient(to top, white, transparent)' }}
            />
          </Box>

          {/* Form area */}
          <Box px={4} pt={2} pb={5}>
            <Box mb={4}>
              <Typography
                variant="h2"
                sx={{ fontWeight: 700, fontSize: '24px', color: '#0f172a', lineHeight: '32px' }}
              >
                Create Account
              </Typography>
              <Typography sx={{ color: '#64748b', fontSize: '16px', lineHeight: '24px' }}>
                Join our community of explorers
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit} noValidate display="flex" flexDirection="column" gap={2.5}>
              {/* Email */}
              <Box>
                <Typography
                  component="label"
                  htmlFor="email"
                  sx={{ fontWeight: 600, fontSize: '14px', color: '#0f172a', lineHeight: '20px', display: 'block', mb: '6px' }}
                >
                  Email address
                </Typography>
                <TextField
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  autoComplete="email"
                  fullWidth
                  value={values.email}
                  onChange={handleTextField('email')}
                  onBlur={handleBlur('email')}
                  error={!!(touched.email && errors.email)}
                  helperText={touched.email ? errors.email : undefined}
                  slotProps={{
                    input: {
                      endAdornment: emailIsValid ? (
                        <InputAdornment position="end">
                          <CheckCircleIcon sx={{ color: '#10b981', fontSize: 20 }} />
                        </InputAdornment>
                      ) : undefined,
                    },
                  }}
                  sx={fieldSx(emailIsValid)}
                />
              </Box>

              {/* Username */}
              <Box>
                <Typography
                  component="label"
                  htmlFor="username"
                  sx={{ fontWeight: 600, fontSize: '14px', color: '#0f172a', lineHeight: '20px', display: 'block', mb: '6px' }}
                >
                  Username
                </Typography>
                <TextField
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  autoComplete="username"
                  fullWidth
                  value={values.username}
                  onChange={handleTextField('username')}
                  onBlur={handleBlur('username')}
                  error={!!(touched.username && errors.username)}
                  helperText={touched.username ? errors.username : undefined}
                  sx={fieldSx(!!(touched.username && !errors.username && values.username))}
                />
              </Box>

              {/* Phone with country code */}
              <Box>
                <Typography
                  component="label"
                  htmlFor="phone"
                  sx={{ fontWeight: 600, fontSize: '14px', color: '#0f172a', lineHeight: '20px', display: 'block', mb: '6px' }}
                >
                  Cellphone number
                </Typography>
                <Box display="flex" gap={1}>
                  {/* Country code — MUI Select */}
                  <FormControl sx={{ width: 112, flexShrink: 0 }}>
                    <Select
                      value={values.country_code}
                      onChange={handleCountryChange}
                      inputProps={{ 'aria-label': 'Country code' }}
                      sx={{
                        height: '48px',
                        borderRadius: '12px',
                        bgcolor: 'white',
                        fontSize: '15px',
                        fontWeight: 500,
                        color: '#0f172a',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#0ea5e9',
                          borderWidth: 2,
                        },
                        '& .MuiSelect-select': { pl: '12px' },
                      }}
                    >
                      {COUNTRY_CODES.map((c) => (
                        <MenuItem key={c.code} value={c.code} sx={{ fontSize: '15px' }}>
                          {c.flag} {c.dial}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Phone number — MUI TextField */}
                  <Box flex={1} minWidth={0}>
                    <TextField
                      id="phone"
                      type="tel"
                      placeholder="000-000-0000"
                      autoComplete="tel"
                      fullWidth
                      value={values.phone}
                      onChange={handleTextField('phone')}
                      onBlur={handleBlur('phone')}
                      error={!!(touched.phone && errors.phone)}
                      sx={fieldSx(!!(touched.phone && !errors.phone && values.phone))}
                    />
                  </Box>
                </Box>
                {touched.phone && errors.phone && (
                  <FormHelperText error sx={{ mx: 0, mt: '4px', fontSize: '12px' }}>
                    {errors.phone}
                  </FormHelperText>
                )}
              </Box>

              {/* Password */}
              <Box>
                <Typography
                  component="label"
                  htmlFor="password"
                  sx={{ fontWeight: 600, fontSize: '14px', color: '#0f172a', lineHeight: '20px', display: 'block', mb: '6px' }}
                >
                  Password
                </Typography>
                <TextField
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  autoComplete="new-password"
                  fullWidth
                  value={values.password}
                  onChange={handleTextField('password')}
                  onBlur={handleBlur('password')}
                  error={!!(touched.password && errors.password)}
                  helperText={touched.password ? errors.password : undefined}
                  sx={fieldSx(!!(touched.password && !errors.password && values.password))}
                />
              </Box>

              {/* Submit — MUI Button */}
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                endIcon={!loading && <ArrowForwardIcon sx={{ fontSize: '18px !important' }} />}
                sx={{
                  height: 56,
                  borderRadius: '12px',
                  bgcolor: '#0ea5e9',
                  fontWeight: 700,
                  fontSize: '16px',
                  textTransform: 'none',
                  letterSpacing: 0,
                  boxShadow:
                    '0px 10px 15px -3px rgba(14,165,233,0.2), 0px 4px 6px -4px rgba(14,165,233,0.2)',
                  mt: '4px',
                  '&:hover': { bgcolor: '#0284c7', boxShadow: 'none' },
                  '&:active': { bgcolor: '#0369a1' },
                  '&.Mui-disabled': { bgcolor: '#0ea5e9', color: 'white', opacity: 0.6 },
                }}
              >
                {loading ? (
                  <Box display="flex" alignItems="center" gap={1}>
                    <CircularProgress size={18} sx={{ color: 'white' }} />
                    <span>Creating account…</span>
                  </Box>
                ) : (
                  'Create Account'
                )}
              </Button>
            </Box>

            {/* Card footer */}
            <Box display="flex" flexDirection="column" gap={2} mt={4}>
              <Box textAlign="center">
                <MuiLink
                  component={NextLink}
                  href="/login/traveler"
                  underline="none"
                  sx={{ color: '#64748b', fontSize: '14px' }}
                >
                  Already have an account?{' '}
                  <Box component="span" sx={{ fontWeight: 700, color: '#0ea5e9' }}>
                    Back to Login
                  </Box>
                </MuiLink>
              </Box>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                gap={1}
                pt={3}
                sx={{ borderTop: '1px solid #f1f5f9' }}
              >
                <LockIcon sx={{ color: '#94a3b8', fontSize: 14 }} />
                <Typography
                  sx={{
                    fontWeight: 700,
                    color: '#94a3b8',
                    fontSize: '11px',
                    letterSpacing: '1.1px',
                    textTransform: 'uppercase',
                  }}
                >
                  Your data is secured with 256-bit encryption
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Secondary links */}
        <Box display="flex" gap={3} justifyContent="center" width="100%" pb={1}>
          {['Help Center', 'Privacy Policy', 'Terms of Service'].map((label) => (
            <MuiLink
              key={label}
              component={NextLink}
              href="#"
              underline="hover"
              sx={{ fontWeight: 500, color: '#64748b', fontSize: '14px', '&:hover': { color: '#0ea5e9' } }}
            >
              {label}
            </MuiLink>
          ))}
        </Box>
      </Box>

      {/* MUI Snackbar for toast notifications */}
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

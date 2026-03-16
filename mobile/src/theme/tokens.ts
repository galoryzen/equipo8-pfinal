export const colors = {
  primary: '#13B6EC',
  onPrimary: '#FFFFFF',
  primary10: '#13B6EC1A',
  primary20: '#13B6EC33',

  text: {
    primary: '#0F172A',
    secondary: '#64748B',
    muted: '#475569',
  },

  surface: {
    soft: '#F8FAFC',
    white: '#FFFFFF',
  },

  border: {
    default: '#E2E8F0',
    subtle: '#F1F5F9',
  },

  accent: '#FF6B6B',

  status: {
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',
  },

  tab: {
    activeBg: '#13B6EC1A',
    activeIcon: '#13B6EC',
    activeLabel: '#13B6EC',
    inactiveIcon: '#94A3B8',
    inactiveLabel: '#94A3B8',
  },
} as const;

export const typography = {
  fontFamily: {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    bold: 'PlusJakartaSans_700Bold',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  ctaPrimary: {
    shadowColor: '#13B6EC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
} as const;

/**
 * TravelHub design tokens — single source for brand and neutral colors.
 * Secondary text uses slate-600 (#475569) instead of slate-500 so body copy
 * meets WCAG 2.1 AA (4.5:1) on white and on warm off-whites (e.g. #f8f6f6).
 * Brand “primary” for fills/icons; `primaryOnLight` for small/medium text on light backgrounds.
 */
export const tokens = {
  brand: {
    primary: '#0EA5E9',
    primaryHover: '#0284C7',
    primaryActive: '#0369A1',
    /** Sky 700 — text / links on white (≥4.5:1 for 14px body) */
    primaryOnLight: '#0369A1',
    /** Manager selected nav accent */
    accentOrange: '#EC5B13',
    /** 10% alpha background for accentOrange */
    accentOrangeSoft: '#EC5B131A',
  },
  text: {
    primary: '#111827',
    /** Slate 600 */
    secondary: '#475569',
    /** Placeholders, hints — gray tuned for light gray fields */
    muted: '#5C6370',
    disabled: '#78716F',
  },
  surface: {
    paper: '#FFFFFF',
    pageWarm: '#F8F6F6',
    pageCool: '#F3F4F6',
    subtle: '#F8FAFC',
    muted: '#F9FAFB',
  },
  border: {
    default: '#E5E7EB',
    subtle: '#E2E8F0',
    subtleHover: '#CBD5E1',
    /** Muted controls on gray-50 fields */
    inputHover: '#D1D5DB',
  },
  ink: {
    charcoal: '#1F2937',
  },
  state: {
    error: '#F87171',
    success: '#16A34A',
    /**
     * Warning palette tuned for WCAG AA contrast on light surfaces:
     * - Use `warningFg` for text/icons on white and warm off-whites.
     * - Use `warningBg` behind `warningFg` text for chips/badges.
     */
    warningFg: '#9A3412',
    warningBg: '#FFF7ED',
    warningBorder: '#FDBA74',
  },
} as const;

export type TravelHubTokens = typeof tokens;

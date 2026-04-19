import type { PropertyPolicyOut } from '@src/types/catalog';

export function formatTimeHM(raw?: string | null): string | null {
  if (!raw) return null;
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const [, h, m] = match;
  return `${h.padStart(2, '0')}:${m}`;
}

export function buildMapsUrl(address: string): string {
  const query = encodeURIComponent(address.trim());
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function buildPhoneUrl(phone: string): string {
  const trimmed = phone.trim();
  const sign = trimmed.startsWith('+') ? '+' : '';
  const digits = trimmed.replace(/[^\d]/g, '');
  return `tel:${sign}${digits}`;
}

export function buildMailtoUrl(email: string): string {
  return `mailto:${email.trim()}`;
}

export function normalizeWebsite(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const HIDDEN_CATEGORIES = new Set(['CHECK_IN', 'CHECK_OUT']);

const CATEGORY_ORDER = ['PETS', 'SMOKING', 'CHILDREN', 'GENERAL'];

export function visibleHouseRules(
  policies: PropertyPolicyOut[],
): PropertyPolicyOut[] {
  const rank = (c: string) => {
    const i = CATEGORY_ORDER.indexOf(c);
    return i === -1 ? CATEGORY_ORDER.length : i;
  };
  return policies
    .filter((p) => !HIDDEN_CATEGORIES.has(p.category))
    .sort((a, b) => rank(a.category) - rank(b.category));
}

export type HouseRuleIcon =
  | 'paw-outline'
  | 'close-circle-outline'
  | 'people-outline'
  | 'information-circle-outline';

export function houseRuleIcon(category: string): HouseRuleIcon {
  switch (category) {
    case 'PETS':
      return 'paw-outline';
    case 'SMOKING':
      return 'close-circle-outline';
    case 'CHILDREN':
      return 'people-outline';
    default:
      return 'information-circle-outline';
  }
}

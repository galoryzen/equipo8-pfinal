import {
  buildMailtoUrl,
  buildMapsUrl,
  buildPhoneUrl,
  formatTimeHM,
  houseRuleIcon,
  normalizeWebsite,
  visibleHouseRules,
} from '@src/features/bookings/booking-detail-actions';
import type { PropertyPolicyOut } from '@src/types/catalog';

describe('formatTimeHM', () => {
  it.each([
    ['15:00:00', '15:00'],
    ['09:30', '09:30'],
    ['9:05', '09:05'],
  ])('normalises %s → %s', (input, expected) => {
    expect(formatTimeHM(input)).toBe(expected);
  });

  it.each([undefined, null, '', 'nope'])('returns null for %p', (v) => {
    expect(formatTimeHM(v as string | null | undefined)).toBeNull();
  });
});

describe('buildMapsUrl', () => {
  it('builds a Google Maps search URL with encoded address', () => {
    const url = buildMapsUrl('Gran Vía 28, 28013 Madrid');
    expect(url).toBe(
      'https://www.google.com/maps/search/?api=1&query=Gran%20V%C3%ADa%2028%2C%2028013%20Madrid',
    );
  });

  it('trims leading/trailing spaces before encoding', () => {
    const url = buildMapsUrl('   Main St   ');
    expect(url).toBe('https://www.google.com/maps/search/?api=1&query=Main%20St');
  });
});

describe('buildPhoneUrl', () => {
  it('keeps the leading + and strips non-digit chars', () => {
    expect(buildPhoneUrl('+52 998 555 0101')).toBe('tel:+529985550101');
  });

  it('drops any non-digit if no leading +', () => {
    expect(buildPhoneUrl('(91) 555-0505')).toBe('tel:915550505');
  });
});

describe('buildMailtoUrl', () => {
  it('prepends mailto: and trims whitespace', () => {
    expect(buildMailtoUrl('  hotel@example.com ')).toBe('mailto:hotel@example.com');
  });
});

describe('normalizeWebsite', () => {
  it('prepends https:// when the url has no scheme', () => {
    expect(normalizeWebsite('example.com')).toBe('https://example.com');
  });

  it('preserves http and https URLs untouched', () => {
    expect(normalizeWebsite('https://hotel.mx')).toBe('https://hotel.mx');
    expect(normalizeWebsite('http://legacy.example')).toBe('http://legacy.example');
  });
});

describe('visibleHouseRules', () => {
  const policy = (category: string, description = 'x'): PropertyPolicyOut => ({
    id: `id-${category}`,
    category,
    description,
  });

  it('excludes CHECK_IN and CHECK_OUT policies', () => {
    const rules = visibleHouseRules([
      policy('CHECK_IN', 'A partir de las 15:00'),
      policy('PETS', 'No mascotas'),
      policy('CHECK_OUT', 'Antes de las 12:00'),
      policy('GENERAL', 'Respetar horas de silencio'),
    ]);
    expect(rules.map((r) => r.category)).toEqual(['PETS', 'GENERAL']);
  });

  it('orders remaining categories PETS → SMOKING → CHILDREN → GENERAL', () => {
    const rules = visibleHouseRules([
      policy('GENERAL'),
      policy('CHILDREN'),
      policy('SMOKING'),
      policy('PETS'),
    ]);
    expect(rules.map((r) => r.category)).toEqual([
      'PETS',
      'SMOKING',
      'CHILDREN',
      'GENERAL',
    ]);
  });
});

describe('houseRuleIcon', () => {
  it.each([
    ['PETS', 'paw-outline'],
    ['SMOKING', 'close-circle-outline'],
    ['CHILDREN', 'people-outline'],
    ['GENERAL', 'information-circle-outline'],
    ['UNKNOWN', 'information-circle-outline'],
  ])('maps %s to %s', (category, icon) => {
    expect(houseRuleIcon(category)).toBe(icon);
  });
});

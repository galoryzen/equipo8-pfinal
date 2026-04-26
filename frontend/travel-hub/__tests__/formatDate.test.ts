import { formatDate, formatDateShort } from '@/app/lib/date/formatDate';
import { describe, expect, it } from 'vitest';

describe('formatDate helpers', () => {
  it('formats DATE values without timezone drift', () => {
    expect(formatDate('2026-04-26')).toBe('Apr 26, 2026');
    expect(formatDateShort('2026-04-26')).toBe('Apr 26');
  });

  it('returns the original value for invalid inputs', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
    expect(formatDateShort('2026-02-31')).toBe('2026-02-31');
  });
});

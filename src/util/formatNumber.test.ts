import Decimal from 'break_infinity.js';
import { describe, expect, it } from 'vitest';
import { formatNumber, formatXp } from './formatNumber';

describe('formatNumber', () => {
  it('shows whole numbers only, rounded to the nearest', () => {
    // Nearest rather than down: a Decimal reconstructs 848,430 as
    // 848429.9999999999, and flooring would quote a price an XP under the one
    // the buy button charges.
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(848_429.9999999999)).toBe('848,430');
    expect(formatNumber(337.5)).toBe('338');
    expect(formatNumber(999.999)).toBe('1,000');
  });

  it('groups thousands rather than reaching for a suffix', () => {
    // A five-figure balance is still a number a player can read and compare
    // against a five-figure price, so it stays spelled out.
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1234)).toBe('1,234');
    expect(formatNumber(61_310)).toBe('61,310');
    expect(formatNumber(999_999)).toBe('999,999');
  });

  it('uses letter suffixes from a million up', () => {
    // Including a value that only reaches a million by rounding.
    expect(formatNumber(999_999.6)).toBe('1.00M');
    expect(formatNumber(1_000_000)).toBe('1.00M');
    expect(formatNumber(4_560_000)).toBe('4.56M');
    expect(formatNumber(new Decimal('7.89e12'))).toBe('7.89T');
  });

  it('falls back to scientific notation past the suffix table', () => {
    expect(formatNumber(new Decimal('1.23e39'))).toBe('1.23e39');
  });

  it('handles negatives and the XP suffix', () => {
    expect(formatNumber(-1500)).toBe('-1,500');
    expect(formatXp(10)).toBe('10 XP');
    expect(formatXp(1234)).toBe('1,234 XP');
  });
});

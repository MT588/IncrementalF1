import Decimal from 'break_infinity.js';
import { describe, expect, it } from 'vitest';
import { formatMoney, formatNumber } from './formatNumber';

describe('formatNumber', () => {
  it('keeps two decimals below a thousand', () => {
    expect(formatNumber(0)).toBe('0.00');
    expect(formatNumber(0.5)).toBe('0.50');
    expect(formatNumber(999.999)).toBe('1000.00');
  });

  it('uses letter suffixes from a thousand up', () => {
    expect(formatNumber(1000)).toBe('1.00K');
    expect(formatNumber(1234)).toBe('1.23K');
    expect(formatNumber(4_560_000)).toBe('4.56M');
    expect(formatNumber(new Decimal('7.89e12'))).toBe('7.89T');
  });

  it('falls back to scientific notation past the suffix table', () => {
    expect(formatNumber(new Decimal('1.23e39'))).toBe('1.23e39');
  });

  it('handles negatives and the euro prefix', () => {
    expect(formatNumber(-1500)).toBe('-1.50K');
    expect(formatMoney(10)).toBe('€10.00');
  });
});

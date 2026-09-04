import Decimal from 'break_infinity.js';

/**
 * Parse a currency amount out of save data. The only place a Decimal is built
 * from untrusted input, because break_infinity *throws* on unparseable strings
 * (`new Decimal('abc')`) and silently yields 0 for `undefined` — both of which
 * would break the promise that loading a save never throws and never quietly
 * zeroes a balance. Returns null for anything that is not a non-negative
 * finite amount, so callers can refuse the save instead.
 */
export function parseAmount(raw: unknown): Decimal | null {
  if (typeof raw !== 'string') return null;
  let amount: Decimal;
  try {
    amount = new Decimal(raw);
  } catch {
    return null;
  }
  return Number.isFinite(amount.mantissa) && amount.gte(0) ? amount : null;
}

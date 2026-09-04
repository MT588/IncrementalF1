import Decimal from 'break_infinity.js';

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/**
 * Below this an amount reads as plain grouped digits — "9,999". Above it the
 * suffix table takes over and two decimals come back, because "1.23M" is a
 * magnitude rather than a fractional XP: nobody counts a million by ones.
 */
const SUFFIX_FROM = 1e6;

/**
 * Format an amount as a whole number: "0", "1,303", "1.23M" … then "1.23e39"
 * past the suffix table.
 *
 * Every XP amount in the game is already whole — `xpPerLap` rounds a payout up
 * and `costOf` quotes a price on a whole rung — so this rounds to the *nearest*
 * rather than down. A Decimal keeps its value as a mantissa and an exponent and
 * reconstructs it by multiplying, which lands a whole 848,430 on
 * 848429.9999999999; flooring that would quote a price one XP under the one the
 * buy button actually charges. Nearest is exact for every amount and honest for
 * the one derived readout that is genuinely fractional, the idle rate.
 */
export function formatNumber(value: Decimal | number): string {
  return render(toDecimal(value));
}

/** An XP balance, payout or price: "0 XP", "13 XP", "1.23M XP". */
export function formatXp(value: Decimal | number): string {
  return `${formatNumber(value)} XP`;
}

function toDecimal(value: Decimal | number): Decimal {
  return value instanceof Decimal ? value : new Decimal(value);
}

function render(d: Decimal): string {
  if (d.lt(0)) return `-${render(d.neg())}`;
  if (d.lt(SUFFIX_FROM)) {
    // Re-checked after rounding: 999,999.6 belongs with the suffixes, not with
    // a bare "1,000,000" that the grouped branch would otherwise print.
    const whole = Math.round(d.toNumber());
    if (whole < SUFFIX_FROM) return group(String(whole));
  }

  let g = Math.floor(Math.floor(d.log10()) / 3);
  let scaled = d.div(Decimal.pow(10, g * 3)).toNumber();
  // Rounding can carry 999.9996 up to 1000.00, which belongs a group along.
  if (scaled >= 999.995) {
    g += 1;
    scaled /= 1000;
  }

  const suffix = SUFFIXES[g];
  if (suffix === undefined) return d.toExponential(2).replace('e+', 'e');
  return `${scaled.toFixed(2)}${suffix}`;
}

/** Thousands separators, so a five-figure balance can be read at a glance. */
function group(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+$)/g, ',');
}

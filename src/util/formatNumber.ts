import Decimal from 'break_infinity.js';

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/**
 * Format a Decimal for display: "0.00", "12.50", "1.23K", "4.56M" … then "1.23e39" past the table.
 * Values under 1000 keep two decimals so slow early trickles are visible.
 */
export function formatNumber(value: Decimal | number): string {
  const d = value instanceof Decimal ? value : new Decimal(value);
  if (d.lt(0)) return `-${formatNumber(d.neg())}`;
  if (d.eq(0)) return '0.00';
  if (d.lt(1000)) return d.toNumber().toFixed(2);

  const exponent = Math.floor(d.log10());
  const group = Math.floor(exponent / 3);
  const suffix = SUFFIXES[group];
  if (suffix === undefined) return d.toExponential(2).replace('e+', 'e');

  const scaled = d.div(Decimal.pow(10, group * 3)).toNumber();
  return `${scaled.toFixed(2)}${suffix}`;
}

export function formatMoney(value: Decimal | number): string {
  return `€${formatNumber(value)}`;
}

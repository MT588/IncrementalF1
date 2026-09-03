export interface Point {
  x: number;
  y: number;
}

/**
 * The point `fraction` of the way round a circle, starting at 12 o'clock and
 * running clockwise (SVG's y axis points down, so increasing angle is clockwise).
 * Pure maths rather than getPointAtLength, so the map needs no DOM and is testable.
 */
export function pointOnCircle(cx: number, cy: number, r: number, fraction: number): Point {
  const angle = (fraction - 0.25) * 2 * Math.PI;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

export interface Point {
  x: number;
  y: number;
}

/**
 * A stadium: two straights joined by semicircular ends, which is the shape
 * every track in the game is drawn as. `straight` is the length of one of the
 * two straights, and the ends are half circles of `radius` centred on either
 * end of them. A circle is just a stadium with no straight.
 */
export interface Stadium {
  cx: number;
  cy: number;
  straight: number;
  radius: number;
}

export interface TrackPoint extends Point {
  /** Which way the rider is travelling across the screen: 1 right, -1 left. */
  facing: 1 | -1;
}

/** Once round, in the same units as the shape itself. */
export function perimeter(track: Stadium): number {
  return 2 * track.straight + 2 * Math.PI * track.radius;
}

/** The lap as an SVG path, drawn clockwise from the start line at top centre. */
export function stadiumPath(track: Stadium): string {
  const { cx, cy, straight, radius } = track;
  const left = cx - straight / 2;
  const right = cx + straight / 2;
  const top = cy - radius;
  const bottom = cy + radius;
  return [
    `M ${cx} ${top}`,
    `H ${right}`,
    `A ${radius} ${radius} 0 0 1 ${right} ${bottom}`,
    `H ${left}`,
    `A ${radius} ${radius} 0 0 1 ${left} ${top}`,
    'Z',
  ].join(' ');
}

/**
 * The point `fraction` of the way round, starting at the start line at top
 * centre and running clockwise. Pure maths rather than `getPointAtLength`, so
 * the map needs no DOM and stays testable; walking the shape by arc length
 * rather than by angle is what keeps the rider's speed even through the bends.
 *
 * Fractions outside a single lap wrap, so a full lap lands back on the line.
 */
export function pointOnStadium(track: Stadium, fraction: number): TrackPoint {
  const { cx, cy, straight, radius } = track;
  const left = cx - straight / 2;
  const right = cx + straight / 2;
  const top = cy - radius;
  const bottom = cy + radius;

  const covered = (fraction - Math.floor(fraction)) * perimeter(track);
  const half = straight / 2;
  const bend = Math.PI * radius;

  // Out of the start line to the end of the top straight.
  if (covered < half) return { x: cx + covered, y: top, facing: 1 };

  // Round the right-hand bend, twelve o'clock to six.
  if (covered < half + bend) return onBend(right, cy, radius, (covered - half) / radius - HALF_PI);

  // Down the bottom straight, right to left.
  if (covered < half + bend + straight) {
    return { x: right - (covered - half - bend), y: bottom, facing: -1 };
  }

  // Round the left-hand bend, six o'clock back up to twelve.
  if (covered < half + 2 * bend + straight) {
    return onBend(left, cy, radius, (covered - half - bend - straight) / radius + HALF_PI);
  }

  // Up the top straight to the line, closing the lap.
  return { x: left + (covered - half - 2 * bend - straight), y: top, facing: 1 };
}

const HALF_PI = Math.PI / 2;

/**
 * A point on one of the bends. The tangent there is `(-sin, cos)`, so the
 * rider turns to face the other way at the widest point of the bend rather
 * than snapping round when the straight begins.
 */
function onBend(cx: number, cy: number, radius: number, angle: number): TrackPoint {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
    facing: Math.sin(angle) > 0 ? -1 : 1,
  };
}

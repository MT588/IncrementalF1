import type { TrackPoint } from '@/util/stadium';

/** Local units, before the wrapping scale: the kart is drawn around 0,0. */
const WHEEL_RADIUS = 2.8;
const HUBS = [-5.5, 5.5] as const;
const SCALE = 1.1;

const KART = {
  outline: '#2e2419',
  body: '#e04b2a',
  stripe: '#f4ead4',
  tyre: '#332b22',
  hub: '#cfd3d8',
  shadow: '#3a2c1d',
} as const;

/** Floor pan and nose in one path: a flat slab with a wedge on the front. */
const BODY = 'M -8 -4.6 H 7.4 L 10.4 -3 L 7.4 -1.4 H -8 Z';

export interface KartProps extends TrackPoint {
  /**
   * Ground covered so far, in view units. The wheels turn to match it — the
   * rolling relation rather than a loop on a timer, so they can never spin at
   * a speed the kart is not travelling at.
   */
  rolled?: number;
}

/** Side on, wheels on the ground at y = 0, nose pointing right before flipping. */
export function Kart({ x, y, facing, rolled = 0 }: KartProps) {
  // The kart is drawn inside its own scale, so that comes off the distance
  // before it is turned into turns of a wheel.
  const spin = (rolled / SCALE / (2 * Math.PI * WHEEL_RADIUS)) * 360;

  return (
    <g transform={`translate(${x} ${y}) scale(${facing * SCALE} ${SCALE})`}>
      {/* Thrown ahead and stretched: the sun is low and off to one side. */}
      <ellipse cx={4} cy={4.4} rx={11} ry={2} fill={KART.shadow} opacity={0.3} />
      {/* Engine behind the seat, and the roll hoop over it. */}
      <rect x={-8.4} y={-7.4} width={3.6} height={3} rx={0.6} fill={KART.outline} />
      <path
        d="M -4.4 -4.4 V -8 H -1.2"
        fill="none"
        stroke={KART.outline}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <path
        d={BODY}
        fill={KART.body}
        stroke={KART.outline}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <path
        d="M -6 -3 H 5"
        fill="none"
        stroke={KART.stripe}
        strokeWidth={0.7}
        strokeLinecap="round"
      />
      {/* Seat, and the steering column reaching forward out of it. */}
      <rect x={-4.2} y={-7.2} width={4} height={3} rx={1} fill={KART.outline} />
      <path d="M 1 -4.6 L 3 -7" stroke={KART.outline} strokeWidth={1} strokeLinecap="round" />
      {HUBS.map((hub) => (
        <g key={hub} transform={`translate(${hub} 0)`}>
          <circle cx={0} cy={0} r={WHEEL_RADIUS} fill={KART.tyre} />
          {/* The wheels turn with the ground they cover, not on a timer. */}
          <g transform={`rotate(${spin})`}>
            <circle cx={0} cy={0} r={1.1} fill={KART.hub} />
            <line x1={0} y1={-1.9} x2={0} y2={1.9} stroke={KART.hub} strokeWidth={0.5} />
          </g>
        </g>
      ))}
    </g>
  );
}

import type { TrackPoint } from '@/util/stadium';

/** Local units, before the wrapping scale: the frame is drawn around 0,0. */
const WHEEL_RADIUS = 4.2;
const RIM_RADIUS = 3.1;
const HUBS = [-6.2, 6.2] as const;
const SCALE = 1.1;

const BIKE = {
  outline: '#2e2419',
  frame: '#e04b2a',
  rim: '#cfd3d8',
  stripe: '#f4ead4',
  shadow: '#3a2c1d',
} as const;

/**
 * The frame, drawn once and stroked twice: a thick dark pass first so the bike
 * reads against grass and dirt alike, then the colour on top of it.
 */
const FRAME =
  'M -6.2 0 L -0.6 0.6 L -3.9 -6.4 Z M -3.9 -6.4 L 4.4 -6.8 M -0.6 0.6 L 4.4 -6.8 ' +
  'M 4.4 -6.8 L 6.2 0 M -5.4 -7.2 H -2.6 M 3.2 -7.6 L 5.6 -6.4';

/** The top tube, picked out in cream over the colour pass. */
const TOP_TUBE = 'M -3.9 -6.4 L 4.4 -6.8';

/**
 * Two crossed lines a wheel, which is all a spoked wheel needs at this size.
 * Drawn about the hub rather than in bike coordinates so they can turn with it.
 */
const SPOKES = [
  [-2.2, -2.2, 2.2, 2.2],
  [-2.2, 2.2, 2.2, -2.2],
] as const;

export interface BicycleProps extends TrackPoint {
  /**
   * Ground covered so far, in view units. The wheels turn to match it — the
   * rolling relation rather than a loop on a timer, so they can never spin at
   * a speed the bike is not travelling at.
   */
  rolled?: number;
}

/** Side on, wheels on the ground at y = 0, nose pointing right before flipping. */
export function Bicycle({ x, y, facing, rolled = 0 }: BicycleProps) {
  // The bike is drawn inside its own scale, so that comes off the distance
  // before it is turned into turns of a wheel.
  const spin = (rolled / SCALE / (2 * Math.PI * WHEEL_RADIUS)) * 360;

  return (
    <g transform={`translate(${x} ${y}) scale(${facing * SCALE} ${SCALE})`}>
      {/* Thrown ahead and stretched: the sun is low and off to one side. */}
      <ellipse cx={4} cy={5} rx={12} ry={2.2} fill={BIKE.shadow} opacity={0.3} />
      <path
        d={FRAME}
        fill="none"
        stroke={BIKE.outline}
        strokeWidth={4.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={FRAME}
        fill="none"
        stroke={BIKE.frame}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d={TOP_TUBE} fill="none" stroke={BIKE.stripe} strokeWidth={0.7} strokeLinecap="round" />
      {HUBS.map((hub) => (
        <g key={hub} transform={`translate(${hub} 0)`}>
          <circle
            cx={0}
            cy={0}
            r={WHEEL_RADIUS}
            fill="none"
            stroke={BIKE.outline}
            strokeWidth={2.6}
          />
          <circle cx={0} cy={0} r={RIM_RADIUS} fill="none" stroke={BIKE.rim} strokeWidth={0.9} />
          {/* The wheels turn with the ground they cover, not on a timer. */}
          <g transform={`rotate(${spin})`}>
            {SPOKES.map(([x1, y1, x2, y2]) => (
              <line
                key={`${x1},${y1}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={BIKE.rim}
                strokeWidth={0.5}
              />
            ))}
          </g>
        </g>
      ))}
      <circle cx={-0.6} cy={0.6} r={1.2} fill={BIKE.outline} />
    </g>
  );
}

import type { TrackPoint } from '@/util/stadium';

const BIKE = {
  outline: '#2e2419',
  frame: '#cc4326',
  rim: '#e7dcc4',
  shadow: '#3a2c1d',
} as const;

/**
 * The frame, drawn once and stroked twice: a thick dark pass first so the bike
 * reads against grass and dirt alike, then the colour on top of it.
 */
const FRAME =
  'M -6.2 0 L -0.6 0.6 L -3.9 -6.4 Z M -3.9 -6.4 L 4.4 -6.8 M -0.6 0.6 L 4.4 -6.8 ' +
  'M 4.4 -6.8 L 6.2 0 M -5.4 -7.2 H -2.6 M 3.2 -7.6 L 5.6 -6.4';

/** Side on, wheels on the ground at y = 0, nose pointing right before flipping. */
export function Bicycle({ x, y, facing }: TrackPoint) {
  return (
    <g transform={`translate(${x} ${y}) scale(${facing * 1.1} 1.1)`}>
      <ellipse cx={0} cy={5.2} rx={9.5} ry={2} fill={BIKE.shadow} opacity={0.25} />
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
      <circle cx={-6.2} cy={0} r={4.2} fill="none" stroke={BIKE.outline} strokeWidth={2.6} />
      <circle cx={6.2} cy={0} r={4.2} fill="none" stroke={BIKE.outline} strokeWidth={2.6} />
      <circle cx={-6.2} cy={0} r={3.1} fill="none" stroke={BIKE.rim} strokeWidth={0.8} />
      <circle cx={6.2} cy={0} r={3.1} fill="none" stroke={BIKE.rim} strokeWidth={0.8} />
      <circle cx={-0.6} cy={0.6} r={1.2} fill={BIKE.outline} />
    </g>
  );
}

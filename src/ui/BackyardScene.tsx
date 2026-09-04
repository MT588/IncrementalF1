import { pointOnStadium, stadiumPath } from '@/util/stadium';
import { BACKYARD_TRACK, VIEW_H, VIEW_W } from './backyardLayout';

const LOOP = stadiumPath(BACKYARD_TRACK);
const LINE = pointOnStadium(BACKYARD_TRACK, 0);

/**
 * Scenery colours, deliberately not theme tokens: this is the backyard itself
 * — grass, dirt, creosote — rather than the pit-wall chrome the rest of the UI
 * is built from, and the next track along will bring its own.
 */
const SCENE = {
  lawn: '#79a45d',
  lawnMown: '#83ae64',
  petal: '#f6f2e2',
  petalPink: '#eb9ab3',
  pollen: '#f2c94c',
  leaf: '#4f7a3d',
  leafLight: '#5c8a46',
  leafDark: '#446b34',
  dirtEdge: '#6f5232',
  dirt: '#bb8c5b',
  dust: '#d2ae7d',
  slab: '#9aa38c',
  shadow: '#3a2c1d',
  roof: '#8a6743',
  roofShade: '#75563a',
  wall: '#c3915f',
  wallShade: '#a1734a',
  plank: '#ad7f52',
  trim: '#6f4e32',
  doorFrame: '#5b3f28',
  door: '#3f2c1c',
  handle: '#d8c9a8',
  glass: '#cfe0c0',
  chalk: '#f4ead4',
  chalkShade: '#4a3423',
} as const;

/** The mower goes up and down, so the lawn comes out in bands. */
const MOWN = [0, 20, 40, 60, 80, 100];

/** Five petals round a centre, at twelve, two, four, eight and ten o'clock. */
const PETALS = [
  [0, -1.3],
  [1.24, -0.4],
  [0.76, 1.05],
  [-0.76, 1.05],
  [-1.24, -0.4],
] as const;

/** Flowers come up in clumps at the edges of the lawn, never across the track. */
const FLOWERS = [
  { x: 10, y: 52, size: 1, pink: false },
  { x: 15.5, y: 58, size: 0.85, pink: true },
  { x: 8, y: 64, size: 0.75, pink: false },
  { x: 46, y: 108, size: 1, pink: false },
  { x: 52.5, y: 113, size: 0.8, pink: false },
  { x: 39, y: 114, size: 0.7, pink: true },
  { x: 96, y: 110, size: 0.9, pink: false },
  { x: 104, y: 115.5, size: 0.7, pink: false },
  { x: 188, y: 52, size: 1, pink: false },
  { x: 192, y: 60, size: 0.8, pink: true },
  { x: 184, y: 44, size: 0.7, pink: false },
  { x: 72, y: 10, size: 0.9, pink: false },
  { x: 150, y: 12, size: 0.8, pink: false },
  { x: 158, y: 6.5, size: 0.65, pink: false },
];

/**
 * Everything in the backyard that does not move: the lawn, the trees leaning
 * in over two corners, the lap worn down to dirt, and the shed standing in the
 * middle of it. Only the bike is drawn on top of this.
 */
export function BackyardScene() {
  return (
    <>
      {/* Mown lawn. */}
      <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill={SCENE.lawn} />
      {MOWN.map((y) => (
        <rect key={y} x={0} y={y} width={VIEW_W} height={10} fill={SCENE.lawnMown} />
      ))}

      {FLOWERS.map((flower) => (
        <g
          key={`${flower.x},${flower.y}`}
          transform={`translate(${flower.x} ${flower.y}) scale(${flower.size})`}
        >
          {PETALS.map(([px, py]) => (
            <circle
              key={`${px},${py}`}
              cx={px}
              cy={py}
              r={1.15}
              fill={flower.pink ? SCENE.petalPink : SCENE.petal}
            />
          ))}
          <circle cx={0} cy={0} r={0.95} fill={flower.pink ? SCENE.petal : SCENE.pollen} />
        </g>
      ))}

      {/* Trees leaning in over the corners. */}
      <circle cx={12} cy={12} r={18} fill={SCENE.leaf} />
      <circle cx={30} cy={18} r={10} fill={SCENE.leafLight} />
      <circle cx={16} cy={30} r={9} fill={SCENE.leafDark} />
      <circle cx={190} cy={112} r={15} fill={SCENE.leaf} />
      <circle cx={176} cy={116} r={9} fill={SCENE.leafLight} />

      {/* The lap, worn down to bare dirt, scuffed along its length. */}
      <path d={LOOP} fill="none" stroke={SCENE.dirtEdge} strokeWidth={15} />
      <path d={LOOP} fill="none" stroke={SCENE.dirt} strokeWidth={12.5} />
      <path
        d={LOOP}
        fill="none"
        stroke={SCENE.dust}
        strokeWidth={12.5}
        strokeDasharray="5 13"
        opacity={0.5}
      />

      {/* Two slabs from the shed door out to the track. */}
      <rect x={94} y={82.5} width={11} height={2.6} rx={0.5} fill={SCENE.slab} />
      <rect x={94} y={86} width={11} height={2.6} rx={0.5} fill={SCENE.slab} opacity={0.6} />

      {/* The shed, standing in the middle of the loop. */}
      <ellipse cx={100} cy={83} rx={31} ry={3} fill={SCENE.shadow} opacity={0.22} />
      <path d="M 68 56 L 100 39 L 132 56 Z" fill={SCENE.roof} />
      <path d="M 100 39 L 132 56 L 122 56 Z" fill={SCENE.roofShade} />
      <rect x={74} y={56} width={52} height={26} fill={SCENE.wall} />
      <rect x={118} y={56} width={8} height={26} fill={SCENE.wallShade} />
      <line x1={68} y1={56} x2={132} y2={56} stroke={SCENE.trim} strokeWidth={1.4} />
      <line x1={82} y1={57} x2={82} y2={82} stroke={SCENE.plank} strokeWidth={0.9} />
      <line x1={88} y1={57} x2={88} y2={82} stroke={SCENE.plank} strokeWidth={0.9} />
      <line x1={112} y1={57} x2={112} y2={82} stroke={SCENE.plank} strokeWidth={0.9} />
      <rect x={93} y={61} width={13} height={21} fill={SCENE.doorFrame} />
      <rect x={94.4} y={62.4} width={10.2} height={18.2} fill={SCENE.door} />
      <circle cx={103.6} cy={72} r={0.9} fill={SCENE.handle} />
      <rect x={79} y={61} width={10} height={8} fill={SCENE.glass} />
      <rect x={79} y={61} width={10} height={8} fill="none" stroke={SCENE.trim} strokeWidth={1} />
      <line x1={84} y1={61} x2={84} y2={69} stroke={SCENE.trim} strokeWidth={0.8} />

      {/* Start and finish, chalked across the track wherever the line falls. */}
      <g transform={`translate(${LINE.x} ${LINE.y})`}>
        <rect x={-3.8} y={-6.6} width={3.8} height={4.4} fill={SCENE.chalk} />
        <rect x={0} y={-2.2} width={3.8} height={4.4} fill={SCENE.chalk} />
        <rect x={-3.8} y={2.2} width={3.8} height={4.4} fill={SCENE.chalk} />
        <rect x={0} y={-6.6} width={3.8} height={4.4} fill={SCENE.chalkShade} />
        <rect x={-3.8} y={-2.2} width={3.8} height={4.4} fill={SCENE.chalkShade} />
        <rect x={0} y={2.2} width={3.8} height={4.4} fill={SCENE.chalkShade} />
      </g>
    </>
  );
}

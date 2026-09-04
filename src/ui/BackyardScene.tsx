import { memo } from 'react';
import { pointOnStadium, stadiumPath } from '@/util/stadium';
import { BACKYARD_TRACK, VIEW_H, VIEW_W } from './backyardLayout';

const LOOP = stadiumPath(BACKYARD_TRACK);
const LINE = pointOnStadium(BACKYARD_TRACK, 0);

/**
 * Scenery colours, deliberately not theme tokens: this is the backyard itself
 * — grass, dirt, creosote — rather than the pit-wall chrome the rest of the UI
 * is built from, and the next track along will bring its own.
 *
 * Late afternoon: the lawn and the shed run warm, the glass is lit from
 * inside, and a low sun rakes across the yard from the upper right.
 */
const SCENE = {
  lawn: '#8aa855',
  lawnMown: '#95b25c',
  lawnShade: '#5f7a3f',
  leaf: '#4f7a3d',
  leafLight: '#5c8a46',
  leafDark: '#446b34',
  dirtEdge: '#6f5232',
  dirt: '#b0824f',
  slab: '#9aa38c',
  shadow: '#3a2c1d',
  roof: '#9a744b',
  roofShade: '#75563a',
  wall: '#d19c63',
  wallShade: '#a1734a',
  plank: '#ad7f52',
  trim: '#6f4e32',
  doorFrame: '#5b3f28',
  door: '#3f2c1c',
  handle: '#d8c9a8',
  glass: '#f2e6b8',
  chalk: '#f4ead4',
  chalkShade: '#4a3423',
} as const;

/** The mower goes up and down, so the lawn comes out in bands. */
const MOWN = [0, 20, 40, 60, 80, 100];

/**
 * Everything in the backyard that does not move: the lawn, the shade the low
 * sun throws across it, the trees leaning in over two corners, the lap worn
 * down to dirt, and the shed standing in the middle of it. Only the kart is
 * drawn on top of this.
 *
 * The lap carries no progress marking of its own — no arc, no sectors, no
 * trail. Where the kart is and the metres in the panel footer are the whole
 * read.
 */
export const BackyardScene = memo(function BackyardScene() {
  return (
    <>
      {/* Mown lawn. */}
      <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill={SCENE.lawn} />
      {MOWN.map((y) => (
        <rect key={y} x={0} y={y} width={VIEW_W} height={10} fill={SCENE.lawnMown} />
      ))}

      {/* One flat wedge of shade, so the light has a direction. */}
      <path d="M 0 0 H 200 V 34 L 0 78 Z" fill={SCENE.lawnShade} opacity={0.28} />

      {/* Trees leaning in over the corners. */}
      <circle cx={12} cy={12} r={18} fill={SCENE.leaf} />
      <circle cx={30} cy={18} r={10} fill={SCENE.leafLight} />
      <circle cx={16} cy={30} r={9} fill={SCENE.leafDark} />
      <circle cx={190} cy={112} r={15} fill={SCENE.leaf} />
      <circle cx={176} cy={116} r={9} fill={SCENE.leafLight} />

      {/* The lap, worn down to bare dirt. Two passes: edge, then fill. */}
      <path d={LOOP} fill="none" stroke={SCENE.dirtEdge} strokeWidth={15} />
      <path d={LOOP} fill="none" stroke={SCENE.dirt} strokeWidth={12.5} />

      {/* Two slabs from the shed door out to the track. */}
      <rect x={94} y={82.5} width={11} height={2.6} rx={0.5} fill={SCENE.slab} />
      <rect x={94} y={86} width={11} height={2.6} rx={0.5} fill={SCENE.slab} opacity={0.6} />

      {/* The shed, standing in the middle of the loop, throwing a long shadow. */}
      <ellipse cx={100} cy={83} rx={31} ry={3} fill={SCENE.shadow} opacity={0.22} />
      <path d="M 74 82 L 30 100 L 46 106 L 90 84 Z" fill={SCENE.shadow} opacity={0.2} />
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
});

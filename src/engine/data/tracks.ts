import type { TrackDef } from '../types';

/** Tracks are distances. A longer track is a new row here, not new code. */
export type TrackId = 'backyard';

export const TRACKS: readonly TrackDef[] = [
  {
    id: 'backyard',
    name: 'Backyard loop',
    description: 'Once around the garden, past the shed and back.',
    lapDistanceM: 30,
    payoutPerLap: 5,
  },
];

export const STARTING_TRACK_ID: TrackId = 'backyard';

export const TRACK_IDS: readonly TrackId[] = TRACKS.map((t) => t.id);

export function getTrack(id: TrackId): TrackDef {
  const def = TRACKS.find((t) => t.id === id);
  if (!def) throw new Error(`Unknown track: ${id}`);
  return def;
}

export function isTrackId(value: unknown): value is TrackId {
  return typeof value === 'string' && TRACK_IDS.includes(value as TrackId);
}

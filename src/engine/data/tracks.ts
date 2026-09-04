import type { TrackDef } from '../types';

/** Tracks are distances. A longer track is a new row here, not new code. */
export type TrackId = 'backyard';

export const TRACKS: readonly TrackDef[] = [
  {
    id: 'backyard',
    name: 'Backyard loop',
    description: 'Once around the garden, past the shed and back.',
    // Ten metres, so the kart is round it in ten seconds at its starting speed:
    // the first lap, and with it the first upgrade, lands before the player has
    // time to wonder what the game wants from them.
    lapDistanceM: 10,
    // A lap of the backyard is worth exactly 1 XP: the smallest interesting
    // number, so every price in the shed reads as a count of laps.
    xpPerMetre: 1 / 10,
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

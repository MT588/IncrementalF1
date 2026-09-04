import { describe, expect, it } from 'vitest';
import { perimeter, pointOnStadium, stadiumPath, type Stadium } from './stadium';

// Two straights of 76 and bends of 32, the shape the backyard is drawn as.
const TRACK: Stadium = { cx: 100, cy: 60, straight: 76, radius: 32 };

describe('perimeter', () => {
  it('is both straights plus one full circle of bend', () => {
    expect(perimeter(TRACK)).toBeCloseTo(2 * 76 + 2 * Math.PI * 32, 9);
  });

  it('is a plain circle when there is no straight', () => {
    expect(perimeter({ cx: 0, cy: 0, straight: 0, radius: 10 })).toBeCloseTo(2 * Math.PI * 10, 9);
  });
});

describe('stadiumPath', () => {
  it('starts on the line at top centre and closes', () => {
    expect(stadiumPath(TRACK)).toBe(
      'M 100 28 H 138 A 32 32 0 0 1 138 92 H 62 A 32 32 0 0 1 62 28 Z',
    );
  });
});

describe('pointOnStadium', () => {
  it('starts on the line at top centre, heading right', () => {
    const start = pointOnStadium(TRACK, 0);
    expect(start.x).toBeCloseTo(100, 9);
    expect(start.y).toBeCloseTo(28, 9);
    expect(start.facing).toBe(1);
  });

  it('runs clockwise: out to the right, then down, then back along the bottom', () => {
    const straightEnd = perimeter(TRACK);

    // The end of the top straight, where the right-hand bend begins.
    const bendStart = pointOnStadium(TRACK, 38 / straightEnd);
    expect(bendStart.x).toBeCloseTo(138, 9);
    expect(bendStart.y).toBeCloseTo(28, 9);

    // The widest point of that bend: three o'clock, and the turn for facing.
    const apex = pointOnStadium(TRACK, (38 + Math.PI * 16) / straightEnd);
    expect(apex.x).toBeCloseTo(170, 9);
    expect(apex.y).toBeCloseTo(60, 9);

    // Onto the bottom straight, now travelling leftwards.
    const bottom = pointOnStadium(TRACK, (38 + Math.PI * 32 + 38) / straightEnd);
    expect(bottom.x).toBeCloseTo(100, 9);
    expect(bottom.y).toBeCloseTo(92, 9);
    expect(bottom.facing).toBe(-1);
  });

  it('faces the way it is travelling, turning at the widest point of each bend', () => {
    const len = perimeter(TRACK);
    const at = (distance: number) => pointOnStadium(TRACK, distance / len).facing;

    // Right-hand bend: still heading right until three o'clock, left after it.
    expect(at(38 + Math.PI * 16 - 1)).toBe(1);
    expect(at(38 + Math.PI * 16 + 1)).toBe(-1);

    // Left-hand bend: still heading left until nine o'clock, right after it.
    const intoLeftBend = 38 + Math.PI * 32 + 76;
    expect(at(intoLeftBend + Math.PI * 16 - 1)).toBe(-1);
    expect(at(intoLeftBend + Math.PI * 16 + 1)).toBe(1);
  });

  it('closes the loop at a full lap, and wraps beyond one', () => {
    const start = pointOnStadium(TRACK, 0);
    for (const lap of [1, 2, 5]) {
      const end = pointOnStadium(TRACK, lap);
      expect(end.x).toBeCloseTo(start.x, 9);
      expect(end.y).toBeCloseTo(start.y, 9);
    }

    const quarter = pointOnStadium(TRACK, 0.25);
    const laterQuarter = pointOnStadium(TRACK, 3.25);
    expect(laterQuarter.x).toBeCloseTo(quarter.x, 9);
    expect(laterQuarter.y).toBeCloseTo(quarter.y, 9);
  });

  it('never leaves the tarmac, at any fraction of a lap', () => {
    const { cx, cy, straight, radius } = TRACK;
    for (let f = 0; f < 1; f += 0.01) {
      const p = pointOnStadium(TRACK, f);
      // On a straight the y is exactly on the edge; on a bend the distance to
      // that bend's centre is exactly the radius. One of the two must hold.
      const onStraight =
        Math.abs(p.x - cx) <= straight / 2 + 1e-9 && Math.abs(Math.abs(p.y - cy) - radius) < 1e-9;
      const bendCentre = p.x > cx ? cx + straight / 2 : cx - straight / 2;
      const onBend = Math.abs(Math.hypot(p.x - bendCentre, p.y - cy) - radius) < 1e-9;
      expect(onStraight || onBend).toBe(true);
    }
  });

  it('covers even ground for even fractions, bends included', () => {
    const len = perimeter(TRACK);
    const step = 1 / 720;
    let shortest = Infinity;
    let longest = 0;
    for (let i = 0; i < 720; i++) {
      const a = pointOnStadium(TRACK, i * step);
      const b = pointOnStadium(TRACK, (i + 1) * step);
      const gap = Math.hypot(b.x - a.x, b.y - a.y);
      shortest = Math.min(shortest, gap);
      longest = Math.max(longest, gap);
    }
    // Chords are a hair shorter than the arc they cut across, so the bends
    // come out fractionally tighter than the straights and never more.
    expect(longest).toBeCloseTo(len * step, 6);
    expect(shortest).toBeGreaterThan(len * step * 0.999);
  });
});

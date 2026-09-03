import { describe, expect, it } from 'vitest';
import { pointOnCircle } from './pointOnCircle';

describe('pointOnCircle', () => {
  it('starts at twelve o clock and runs clockwise', () => {
    const top = pointOnCircle(100, 60, 40, 0);
    expect(top.x).toBeCloseTo(100, 9);
    expect(top.y).toBeCloseTo(20, 9);

    // SVG y grows downwards, so a quarter lap is to the right, half is below.
    const right = pointOnCircle(100, 60, 40, 0.25);
    expect(right.x).toBeCloseTo(140, 9);
    expect(right.y).toBeCloseTo(60, 9);

    const bottom = pointOnCircle(100, 60, 40, 0.5);
    expect(bottom.x).toBeCloseTo(100, 9);
    expect(bottom.y).toBeCloseTo(100, 9);
  });

  it('closes the loop at a full lap', () => {
    const start = pointOnCircle(0, 0, 10, 0);
    const end = pointOnCircle(0, 0, 10, 1);
    expect(end.x).toBeCloseTo(start.x, 9);
    expect(end.y).toBeCloseTo(start.y, 9);
  });

  it('stays on the circle at any fraction', () => {
    for (const f of [0.1, 0.37, 0.62, 0.99]) {
      const p = pointOnCircle(100, 60, 40, f);
      expect(Math.hypot(p.x - 100, p.y - 60)).toBeCloseTo(40, 9);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { approach, type Glide } from './smoothing';

const GLIDE: Glide = { tau: 0.14, snapAt: 30, epsilon: 0.01 };

describe('approach', () => {
  it('closes part of the gap, never overshooting', () => {
    const next = approach(0, 10, 1 / 60, GLIDE);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(10);
  });

  it('covers ~63% of the gap in one time constant', () => {
    expect(approach(0, 10, GLIDE.tau, GLIDE)).toBeCloseTo(10 * (1 - Math.exp(-1)), 6);
  });

  it('lands on the same place however the time is sliced', () => {
    // The point of the exponential: ten short frames and one long one agree,
    // so the bike moves at the same speed whatever the frame rate.
    let stepped = 0;
    for (let i = 0; i < 10; i++) stepped = approach(stepped, 10, 0.01, GLIDE);
    expect(stepped).toBeCloseTo(approach(0, 10, 0.1, GLIDE), 9);
  });

  it('arrives rather than crawling the last hundredth', () => {
    expect(approach(9.999, 10, 1 / 60, GLIDE)).toBe(10);
    expect(approach(0, 10, 10, GLIDE)).toBe(10);
  });

  it('jumps a gap bigger than snapAt, which is offline catch-up', () => {
    expect(approach(0, 14_400, 1 / 60, GLIDE)).toBe(14_400);
  });

  it('jumps backwards without easing, which is a reset or a reload', () => {
    expect(approach(500, 0, 1 / 60, GLIDE)).toBe(0);
  });

  it('is a no-op for a frame with no time in it', () => {
    expect(approach(3, 10, 0, GLIDE)).toBe(3);
    expect(approach(3, 10, -1, GLIDE)).toBe(3);
  });
});

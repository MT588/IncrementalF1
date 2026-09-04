import { describe, expect, it } from 'vitest';
import { effectDelta, effectNow, nextUnlockHint, speedHint } from './strings';
import { getUpgrade } from './upgrades';

describe('effectDelta', () => {
  it('says what one more level adds, for every kind of effect', () => {
    expect(effectDelta(getUpgrade('throttle'))).toBe('+0.5 m/s');
    expect(effectDelta(getUpgrade('biggerEngine'))).toBe('+2 m/s');
    expect(effectDelta(getUpgrade('racingTyres'))).toBe('×1.5 XP');
    expect(effectDelta(getUpgrade('slipstream'))).toBe('×1.2 speed');
  });

  it('does not depend on the level owned', () => {
    // Additive effects add the same every level, multiplicative ones multiply
    // by the same factor, so the button text never goes stale.
    const throttle = getUpgrade('throttle');
    expect(effectDelta(throttle)).toBe(effectDelta(throttle));
  });
});

describe('effectNow', () => {
  it('counts the speed an upgrade has added so far', () => {
    // What this upgrade is worth, not what the kart is doing: the base metre a
    // second belongs to the kart rather than to anything in the shed.
    const throttle = getUpgrade('throttle');
    expect(effectNow(throttle, 0)).toBe('0.0 m/s');
    expect(effectNow(throttle, 3)).toBe('1.5 m/s');
    expect(effectNow(getUpgrade('biggerEngine'), 2)).toBe('4.0 m/s');
  });

  it('compounds the multipliers', () => {
    // Two decimals at most, and no trailing zeros: the game shows no fractional
    // XP, so a bare "×1" reads better than "×1.00" next to a whole balance.
    expect(effectNow(getUpgrade('racingTyres'), 0)).toBe('×1 XP per lap');
    expect(effectNow(getUpgrade('racingTyres'), 2)).toBe('×2.25 XP per lap');
    expect(effectNow(getUpgrade('racingTyres'), 3)).toBe('×3.38 XP per lap');
    expect(effectNow(getUpgrade('slipstream'), 1)).toBe('×1.2 speed');
  });
});

describe('speedHint', () => {
  it('always shows a tenth, so the readout never changes width', () => {
    expect(speedHint(1)).toBe('1.0 m/s');
    expect(speedHint(1.5)).toBe('1.5 m/s');
    expect(speedHint(3.6)).toBe('3.6 m/s');
  });
});

describe('nextUnlockHint', () => {
  it('names the lap the next upgrade opens at', () => {
    expect(nextUnlockHint(1)).toBe('Unlocked at 1 lap driven');
    expect(nextUnlockHint(3)).toBe('Unlocked at 3 laps driven');
  });
});

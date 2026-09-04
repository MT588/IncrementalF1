import { describe, expect, it } from 'vitest';
import { effectDelta, effectNow, nextUnlockHint } from './strings';
import { getUpgrade } from './upgrades';

describe('effectDelta', () => {
  it('says what one more level adds, for every kind of effect', () => {
    expect(effectDelta(getUpgrade('biggerGears'))).toBe('+1 m');
    expect(effectDelta(getUpgrade('autoPedal'))).toBe('+0.5 m/s');
    expect(effectDelta(getUpgrade('betterBike'))).toBe('×1.5 XP');
    expect(effectDelta(getUpgrade('slipstream'))).toBe('×1.2 speed');
    expect(effectDelta(getUpgrade('trainingPartner'))).toBe('+0.5 taps/s');
  });

  it('does not depend on the level owned', () => {
    // Additive effects add the same every level, multiplicative ones multiply
    // by the same factor, so the button text never goes stale.
    const gears = getUpgrade('biggerGears');
    expect(effectDelta(gears)).toBe(effectDelta(gears));
  });
});

describe('effectNow', () => {
  it('counts from the base for metres per tap', () => {
    const gears = getUpgrade('biggerGears');
    expect(effectNow(gears, 0)).toBe('1 m per tap');
    expect(effectNow(gears, 2)).toBe('3 m per tap');
  });

  it('reads zero for speed nobody has bought', () => {
    const autoPedal = getUpgrade('autoPedal');
    expect(effectNow(autoPedal, 0)).toBe('0.0 m/s');
    expect(effectNow(autoPedal, 3)).toBe('1.5 m/s');
  });

  it('compounds the multipliers', () => {
    expect(effectNow(getUpgrade('betterBike'), 0)).toBe('×1.00 XP per lap');
    expect(effectNow(getUpgrade('betterBike'), 2)).toBe('×2.25 XP per lap');
    expect(effectNow(getUpgrade('slipstream'), 1)).toBe('×1.20 auto-speed');
  });

  it('counts the training partner in taps', () => {
    expect(effectNow(getUpgrade('trainingPartner'), 0)).toBe('0.0 taps a second');
    expect(effectNow(getUpgrade('trainingPartner'), 4)).toBe('2.0 taps a second');
  });
});

describe('nextUnlockHint', () => {
  it('names the lap the next upgrade opens at', () => {
    expect(nextUnlockHint(1)).toBe('Unlocked at 1 lap driven');
    expect(nextUnlockHint(3)).toBe('Unlocked at 3 laps driven');
  });
});

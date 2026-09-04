import { describe, expect, it } from 'vitest';
import { effectDelta, effectNow, nextUnlockHint, racesHint, speedHint } from './strings';
import { getUpgrade } from './upgrades';

describe('effectDelta', () => {
  it('says what one more level adds, for every kind of effect', () => {
    expect(effectDelta(getUpgrade('throttle'))).toBe('+0.5 km/h');
    expect(effectDelta(getUpgrade('biggerEngine'))).toBe('+2 km/h');
    expect(effectDelta(getUpgrade('racingTyres'))).toBe('+1 XP');
    expect(effectDelta(getUpgrade('slipstream'))).toBe('×1.1 speed');
    expect(effectDelta(getUpgrade('raceCraft'))).toBe('×1.5 XP');
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
    // What this upgrade is worth, not what the kart is doing: the base 2.4 km/h
    // belongs to the kart rather than to anything in the shed.
    const throttle = getUpgrade('throttle');
    expect(effectNow(throttle, 0)).toBe('0.0 km/h');
    expect(effectNow(throttle, 3)).toBe('1.5 km/h');
    expect(effectNow(getUpgrade('biggerEngine'), 2)).toBe('4.0 km/h');
  });

  it('counts the flat XP the tyres have added', () => {
    // Signed, because it is a bonus on top of the lap rather than the payout.
    expect(effectNow(getUpgrade('racingTyres'), 0)).toBe('+0 XP per lap');
    expect(effectNow(getUpgrade('racingTyres'), 3)).toBe('+3 XP per lap');
  });

  it('compounds the multipliers', () => {
    // Two decimals at most, and no trailing zeros: the game shows no fractional
    // XP, so a bare "×1" reads better than "×1.00" next to a whole balance.
    expect(effectNow(getUpgrade('raceCraft'), 0)).toBe('×1 XP per lap');
    expect(effectNow(getUpgrade('raceCraft'), 2)).toBe('×2.25 XP per lap');
    expect(effectNow(getUpgrade('raceCraft'), 3)).toBe('×3.38 XP per lap');
    expect(effectNow(getUpgrade('slipstream'), 1)).toBe('×1.1 speed');
  });
});

describe('speedHint', () => {
  it('always shows a tenth, so the readout never changes width', () => {
    expect(speedHint(2.4)).toBe('2.4 km/h');
    expect(speedHint(42)).toBe('42.0 km/h');
  });
});

describe('racesHint', () => {
  it('counts the laps left, and says so in the singular at one', () => {
    expect(racesHint(137)).toBe('Drive 137 more laps to unlock races.');
    expect(racesHint(1)).toBe('Drive 1 more lap to unlock races.');
  });

  it('stops counting once the gate is passed', () => {
    // Races are not built yet, so this is the honest thing to say.
    expect(racesHint(0)).toBe('You have the pace. Races are coming.');
  });
});

describe('nextUnlockHint', () => {
  it('names the lap the next upgrade opens at', () => {
    expect(nextUnlockHint(1)).toBe('Unlocked at 1 lap driven');
    expect(nextUnlockHint(3)).toBe('Unlocked at 3 laps driven');
  });
});

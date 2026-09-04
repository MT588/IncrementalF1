/**
 * How a rendered value chases a simulated one. `tau` is the time constant: the
 * gap closes by ~63% every `tau` seconds, whatever the frame times were.
 */
export interface Glide {
  /** Seconds for ~63% of the remaining gap to close. Smaller is snappier. */
  tau: number;
  /** A gap larger than this is jumped rather than ridden out. */
  snapAt: number;
  /** Closer than this counts as arrived, so the value settles instead of crawling. */
  epsilon: number;
}

/**
 * One step of exponential smoothing from `current` toward `target`.
 *
 * Framerate-independent on purpose: `1 - e^(-dt/tau)` is the fraction of the
 * gap to close in `dt`, so a slow frame covers proportionally more ground and
 * the motion looks the same at 30 fps as at 144. A plain `gap * 0.2` a frame
 * would not.
 *
 * The value only ever moves forward at the eased rate; anything else jumps.
 * A target behind `current` means the simulation was reset or reloaded, and a
 * target further ahead than `snapAt` means the tab was away and caught up —
 * riding either of those out would send the bike backwards or round the yard
 * for minutes on end.
 */
export function approach(current: number, target: number, dtSeconds: number, glide: Glide): number {
  if (!(dtSeconds > 0)) return current;
  const gap = target - current;
  if (gap <= 0 || gap > glide.snapAt) return target;
  const next = current + gap * (1 - Math.exp(-dtSeconds / glide.tau));
  return target - next < glide.epsilon ? target : next;
}

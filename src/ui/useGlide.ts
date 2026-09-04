import { useEffect, useRef, useState } from 'react';
import { approach, type Glide } from '@/util/smoothing';

/**
 * A number that chases `target` instead of jumping to it, one step of
 * `approach` per animation frame.
 *
 * The simulation moves the bike in steps — a whole metre when the player
 * clicks, a tick's worth ten times a second while it pedals itself — and a
 * step of one metre is a twelfth of the yard, which reads as a hop. Easing the
 * *drawn* distance keeps the state honest and the motion continuous: the store
 * is still the truth, this is only how the truth is arrived at on screen.
 *
 * `target` must be cumulative rather than a position inside a lap: easing a
 * value that resets at the line would sweep the bike backwards across the yard
 * on every rollover.
 *
 * Settles exactly on the target and then stops setting state, so an idle
 * backyard costs nothing but the frame callback.
 */
export function useGlide(target: number, glide: Glide): number {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);
  // Read through refs inside the frame loop so it can be set up once and keep
  // running, rather than being torn down and rebuilt on every store update.
  const targetRef = useRef(target);
  const glideRef = useRef(glide);
  targetRef.current = target;
  glideRef.current = glide;

  useEffect(() => {
    let frame = 0;
    let last: number | null = null;

    const step = (now: number) => {
      // Cap the step: a tab that was hidden hands back one enormous frame.
      const dt = last === null ? 0 : Math.min((now - last) / 1000, 0.25);
      last = now;
      const next = approach(shownRef.current, targetRef.current, dt, glideRef.current);
      if (next !== shownRef.current) {
        shownRef.current = next;
        setShown(next);
      }
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, []);

  return shown;
}

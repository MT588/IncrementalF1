import type { Stadium } from '@/util/stadium';

/** The backyard is drawn in these units and scales to whatever width it gets. */
export const VIEW_W = 200;
export const VIEW_H = 120;

/** Where the lap runs: two 76-unit straights joined by bends of 32. */
export const BACKYARD_TRACK: Stadium = { cx: 100, cy: 60, straight: 76, radius: 32 };

/**
 * Interaction polish helpers (spec §8, Task 6). Everything here is *progressive
 * enhancement* for a fine-pointer, motion-safe desktop: coarse-pointer, reduced-motion
 * and keyboard users are unaffected (real links stay real links, focus-visible is
 * untouched, and the gated behaviours simply never initialise).
 *
 * `POLISH_QUERY` is the single gate every pointer-polish feature shares (custom cursor,
 * magnetic CTA, hover arrows). The live clock is NOT gated on it — a clock is content,
 * not motion — but its blinking colon is gated on motion-safe (see `useLocalClock`).
 */

/** Fine pointer AND no reduced-motion preference — the desktop-polish gate (§8/§9). */
export const POLISH_QUERY = "(pointer: fine) and (prefers-reduced-motion: no-preference)";

/** True only in the browser when the polish gate matches. SSR-safe (returns false). */
export function polishEnabled(): boolean {
  return typeof window !== "undefined" && window.matchMedia(POLISH_QUERY).matches;
}

export { initMagnetic } from "./magnetic";
export { wireHoverArrows } from "./hoverArrows";
export { useLocalClock } from "./useLocalClock";

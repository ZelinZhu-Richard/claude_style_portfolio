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

/**
 * Mobile detection (spec §10): coarse pointer OR a narrow viewport. Shared by every gate
 * that must agree with ScrollStory's MOBILE matchMedia context (Scene particle/DPR
 * downshift + line cap, Loader short-fade) so the whole app treats a device the same way.
 * The width term is `not (min-width: 768px)` — the EXACT complement of DESKTOP's
 * `min-width:768px` (NOT `max-width:767px`, which would leave the fractional-width gap
 * (767px,768px) matching neither). So 768px fine-pointer is desktop everywhere and there
 * is no seam. (Polish gates use `POLISH_QUERY`, which already excludes coarse via `pointer:fine`.)
 */
export const MOBILE_QUERY = "(not (min-width: 768px)), (pointer: coarse)";

/** True only in the browser when the device is mobile per `MOBILE_QUERY`. SSR-safe. */
export function isMobile(): boolean {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches;
}

export { initMagnetic } from "./magnetic";
export { wireHoverArrows } from "./hoverArrows";
export { useLocalClock } from "./useLocalClock";

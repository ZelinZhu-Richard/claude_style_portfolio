/**
 * The ScrollStory ↔ chapter handoff contract.
 *
 * ScrollStory owns each pinned chapter's empty scrubbed timeline (spec §11). A
 * chapter component exposes a `ChapterHandle` (via React-19 `ref` +
 * `useImperativeHandle`); ScrollStory calls `connect(timeline)` INSIDE its desktop
 * `gsap.matchMedia` context, after `document.fonts.ready`, so every tween/trigger
 * the chapter builds is collected into that context and reverted together on media
 * change / unmount. `connect` returns an optional cleanup that reverts the
 * chapter's SplitText instances (a gsap context does not revert SplitText DOM).
 *
 * Because `connect` runs only in the DESKTOP context, the REDUCED / mobile context
 * never calls it — the chapter's DOM then stays at its natural, full-opacity CSS
 * state (statically readable), which is the reduced-motion fallback §9 wants.
 */

import { ScrollTrigger } from "gsap/ScrollTrigger";

// `gsap.core.*` is an ambient global namespace from GSAP's type definitions — no
// value import needed to reference it in a type position.

export interface ChapterHandle {
  /**
   * Attach this chapter's scrubbed beats + one-shots to its pinned timeline.
   * The pinned ScrollTrigger is reachable as `timeline.scrollTrigger`.
   * @returns optional cleanup reverting the chapter's SplitText instances.
   */
  connect: (timeline: gsap.core.Timeline) => (() => void) | void;
}

/**
 * Fire a one-shot at a LOCAL progress of a pinned chapter (used for Rule-D chip
 * scrambles, the Scutum strikethrough, etc. — things that must play in real time,
 * not scrub). Builds a point ScrollTrigger whose absolute scroll position tracks
 * the pin's [start, end] (function-based, so it re-measures on refresh).
 *
 *   reveal → played when scrolling DOWN past `localProgress`
 *   reset  → played when scrolling back UP past it (so the beat can replay)
 *
 * Created inside the caller's gsap context (a chapter `connect`) → auto-killed on
 * teardown.
 */
export function pulseAt(
  pin: ScrollTrigger,
  localProgress: number,
  reveal: () => void,
  reset?: () => void,
): ScrollTrigger {
  const at = () => pin.start + localProgress * (pin.end - pin.start);
  return ScrollTrigger.create({
    // Numeric start/end (no trigger element) = absolute scroll px, the same idiom
    // ScrollStory's page-progress trigger uses. A 1px window makes it a clean point.
    start: at,
    end: () => at() + 1,
    onEnter: reveal,
    onLeaveBack: reset,
  });
}

/**
 * Dev-only guard. Each chapter normalises its scrubbed timeline to totalDuration 1
 * so "timeline time == pin-local progress" and every §6 beat anchor is honoured. A
 * scrubbed tween whose end overruns 1 would rescale the whole scroll→time mapping and
 * fire beats early — so after building a chapter's beats, assert the invariant. No-op
 * in production.
 */
export function assertNormalized(timeline: gsap.core.Timeline, label: string): void {
  if (process.env.NODE_ENV === "production") return;
  const total = timeline.totalDuration();
  console.assert(
    Math.abs(total - 1) < 1e-3,
    `[${label}] chapter timeline totalDuration must be 1 (time == local progress); got ${total.toFixed(4)}`,
  );
}

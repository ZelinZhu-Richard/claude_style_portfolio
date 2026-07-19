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

/**
 * Options that tune how a chapter builds its beats. Passed by ScrollStory from the
 * active `gsap.matchMedia` context.
 *
 * `mobile` selects the spec §10 mobile motion-safe build: Rule B word-scrubs become
 * one-shot staggered fades on enter (scrub-on-touch feels broken), the Honors marquee
 * drifts at a constant speed (no velocity coupling), and flow / unpinned chapters that
 * are pinned on desktop (Hero, Community, Research) reveal on enter instead of scrubbing.
 * Rule A blur-ins, counters, and chip scrambles are kept as one-shots. Desktop passes
 * no options (or `{}`), so its build path is byte-identical to before this task.
 *
 * The REDUCED-motion context (§9) never calls `connect` at all — chapters then render at
 * their natural, full-opacity CSS state, which is the statically-readable fallback §9
 * wants (ScrollStory adds the §9 0.4s Rule-A fades itself).
 */
export interface ConnectOptions {
  /** Spec §10 mobile motion-safe build (see above). */
  mobile?: boolean;
}

export interface ChapterHandle {
  /**
   * Attach this chapter's beats to the scroll spine.
   *
   * PINNED chapters receive their pinned scrubbed `timeline` (its ScrollTrigger is
   * reachable as `timeline.scrollTrigger`) and hang Rule A–D beats on it. FLOW / sticky
   * chapters (Honors, Contact — and, on mobile, Hero / Community / Research which unpin
   * per §10) have no pinned timeline, so ScrollStory calls `connect(undefined, opts)`
   * — they build only real-time one-shot reveals on their own DOM. Those triggers are
   * created inside the calling matchMedia context, so they tear down with it.
   *
   * @param timeline the pinned scrubbed timeline (pinned chapters), or undefined (flow).
   * @param opts     build tuning — `{ mobile: true }` selects the §10 mobile build.
   * @returns optional cleanup reverting the chapter's SplitText instances.
   */
  connect: (timeline?: gsap.core.Timeline, opts?: ConnectOptions) => (() => void) | void;
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

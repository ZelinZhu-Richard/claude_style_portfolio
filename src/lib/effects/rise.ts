/**
 * Rule C — `y:24→0 + fade` reveal (spec §6). ease.reveal (power3.out),
 * duration.reveal (0.6s). The workhorse for cards / stats / rows / chips.
 *
 * Two composition modes:
 *  - SCRUBBED on a chapter timeline: pass `timeline` + `position` (local progress).
 *    We `set` the targets hidden at time 0, then `to` them visible at `position`
 *    with an optional stagger — so they stay hidden BEFORE their window and reveal
 *    across it as the chapter scrolls.
 *  - ONE-SHOT: omit `timeline`; pass a `scrollTrigger` (or nothing to play on
 *    creation). A plain `gsap.from`.
 *
 * Returns the created tween.
 */

import { gsap } from "gsap";
import type { ScrollTrigger } from "gsap/ScrollTrigger";
import { ease, duration as durations } from "@/lib/motion/tokens";

export interface RiseOptions {
  /** Scrubbed mode: the chapter timeline to attach to. */
  timeline?: gsap.core.Timeline;
  /** Scrubbed mode: local-progress position (0..1) to reveal at. */
  position?: number | string;
  /** Stagger between targets (e.g. `stagger.cards` = 0.08). */
  stagger?: number;
  /** Travel distance in px (spec: 24). */
  y?: number;
  /** Reveal duration in seconds (spec: 0.6). */
  duration?: number;
  /** One-shot mode: fire on scroll. */
  scrollTrigger?: ScrollTrigger.Vars;
}

// gsap tween targets: element(s), array, or NodeList.
type RiseTargets = gsap.TweenTarget;

export function rise(
  targets: RiseTargets,
  opts: RiseOptions = {},
): gsap.core.Tween | gsap.core.Timeline {
  const y = opts.y ?? 24;
  const dur = opts.duration ?? durations.reveal;

  if (opts.timeline) {
    opts.timeline.set(targets, { y, opacity: 0 }, 0);
    // `timeline.to` returns the timeline (for chaining), not the tween.
    return opts.timeline.to(
      targets,
      { y: 0, opacity: 1, duration: dur, ease: ease.reveal, stagger: opts.stagger },
      opts.position ?? 0,
    );
  }

  return gsap.from(targets, {
    y,
    opacity: 0,
    duration: dur,
    ease: ease.reveal,
    stagger: opts.stagger,
    scrollTrigger: opts.scrollTrigger,
  });
}

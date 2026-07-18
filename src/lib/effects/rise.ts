/**
 * Rule C — `y:24→0 + fade` reveal (spec §6). ease.reveal (power3.out). The
 * workhorse for cards / stats / rows / chips.
 *
 * Two composition modes:
 *  - SCRUBBED on a chapter timeline: pass `timeline` + a local-progress window
 *    `[position, end]`. Each `connect` normalises its timeline to totalDuration 1
 *    (time == pin-local progress), so a scrubbed reveal MUST stay inside its window
 *    or it pushes totalDuration past 1 and shifts every other beat early. We `set`
 *    the targets hidden at time 0, then a staggered `to` fills exactly
 *    `[position, end]`: step = duration = stagger = `(end − position) / n`, so the
 *    last target lands on `end` (gap-free, same scheme as `wordScrub`). `end`
 *    defaults to `position + 0.1` for a tight single-element reveal.
 *  - ONE-SHOT (real time): omit `timeline`; pass a `scrollTrigger` (or nothing to
 *    play on creation). Uses `duration` (default 0.6s) + `stagger`.
 *
 * Returns the created tween (one-shot) or the timeline (scrubbed, for chaining).
 */

import { gsap } from "gsap";
import type { ScrollTrigger } from "gsap/ScrollTrigger";
import { ease, duration as durations } from "@/lib/motion/tokens";

export interface RiseOptions {
  /** Scrubbed mode: the chapter timeline to attach to. */
  timeline?: gsap.core.Timeline;
  /** Scrubbed mode: local-progress position (0..1) where the reveal begins. */
  position?: number;
  /** Scrubbed mode: local-progress position (0..1) where the LAST target finishes. */
  end?: number;
  /** One-shot mode: stagger between targets (e.g. `stagger.cards` = 0.08). */
  stagger?: number;
  /** Travel distance in px (spec: 24). */
  y?: number;
  /** One-shot mode: reveal duration in seconds (spec: 0.6). */
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

  if (opts.timeline) {
    const start = opts.position ?? 0;
    const end = opts.end ?? start + 0.1;
    const n = Math.max(gsap.utils.toArray(targets).length, 1);
    // Gap-free coverage of [start, end]: duration == stagger == step, last lands on
    // `end` — keeping the whole staggered reveal inside its window (totalDuration ≤ 1).
    const step = Math.max((end - start) / n, 0.0001);
    opts.timeline.set(targets, { y, opacity: 0 }, 0);
    // `timeline.to` returns the timeline (for chaining), not the tween.
    return opts.timeline.to(
      targets,
      { y: 0, opacity: 1, duration: step, ease: ease.reveal, stagger: step },
      start,
    );
  }

  return gsap.from(targets, {
    y,
    opacity: 0,
    duration: opts.duration ?? durations.reveal,
    ease: ease.reveal,
    stagger: opts.stagger,
    scrollTrigger: opts.scrollTrigger,
  });
}

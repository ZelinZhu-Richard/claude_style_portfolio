/**
 * Rule B — word-by-word opacity scrub (spec §6). NO blur.
 *
 * Each word eases `opacity 0.15 → 1`, the words staggered ALONG a scrubbed
 * timeline so the paragraph "writes on" as the chapter is scrolled. Reserved for
 * pinned body paragraphs (hero tagline, About body, Safety beats).
 *
 * Composition: pass the chapter's scrubbed timeline plus the local-progress window
 * `[start, end]` (0..1 of the chapter, because each `connect` normalises its
 * timeline so time == local progress). Implementation detail: we `set` the words
 * to the dim start value at time 0 (so they read dim BEFORE their reveal window,
 * not full-bright), then a staggered `to(1)` fills exactly `[start, end]` — first
 * word begins at `start`, last word finishes at `end`.
 *
 * Returns the SplitText so the caller can revert it on teardown.
 */

import { gsap } from "gsap";
import { SplitText } from "./plugins";

export interface WordScrubOptions {
  /** Local-progress position (0..1) where the first word begins revealing. */
  start?: number;
  /** Local-progress position (0..1) where the last word finishes revealing. */
  end?: number;
  /** Dim starting opacity (spec: 0.15). */
  from?: number;
}

export function wordScrub(
  timeline: gsap.core.Timeline,
  target: Element,
  opts: WordScrubOptions = {},
): SplitText {
  const split = new SplitText(target, { type: "words", aria: "auto" });
  const words = split.words;

  const start = opts.start ?? 0;
  const end = opts.end ?? 1;
  const from = opts.from ?? 0.15;
  const span = Math.max(end - start, 0.0001);
  const n = Math.max(words.length, 1);
  // Each word both lasts and steps `span / n` → continuous, gap-free coverage of
  // the window with the last word landing exactly on `end`.
  const step = span / n;

  timeline.set(words, { opacity: from }, 0);
  timeline.to(
    words,
    { opacity: 1, ease: "none", duration: step, stagger: step },
    start,
  );

  return split;
}

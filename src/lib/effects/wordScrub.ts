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
import type { ScrollTrigger } from "gsap/ScrollTrigger";
import { ease, duration, stagger } from "@/lib/motion/tokens";
import { SplitText } from "./plugins";

export interface WordScrubOptions {
  /** Local-progress position (0..1) where the first word begins revealing. */
  start?: number;
  /** Local-progress position (0..1) where the last word finishes revealing. */
  end?: number;
  /** Dim starting opacity (spec: 0.15). */
  from?: number;
}

export interface WordFadeOptions {
  /** Fire on scroll (one-shot; use `once: true`) instead of on creation. */
  scrollTrigger?: ScrollTrigger.Vars;
  /** Per-word stagger (default `stagger.words` = 0.05). */
  stagger?: number;
  /** Dim starting opacity the words fade UP from (spec: 0.15). */
  from?: number;
}

/**
 * Rule B for MOBILE (spec §10): the same word-by-word reveal, but as a ONE-SHOT
 * staggered fade on enter instead of a scroll scrub — "scrub on touch feels broken".
 * Words fade `from → 1` (default 0.15 → 1, matching the scrub's dim start) with the
 * §9 words stagger and a reveal-duration ease, played once when the trigger enters.
 *
 * Returns the SplitText so the caller can revert it on teardown, exactly like `wordScrub`.
 */
export function wordFadeIn(target: Element, opts: WordFadeOptions = {}): SplitText {
  // `aria: "none"` (not SplitText's default "auto"): every current caller targets a
  // `<p>`, and "auto" sets `aria-label` on the container — invalid per ARIA (the
  // paragraph role doesn't support name-from-author; Lighthouse/axe flags it as
  // `aria-prohibited-attr`). "none" leaves the split `<span>` words un-hidden, so
  // assistive tech still reads the identical text straight off the DOM — no change
  // in what's announced, just no invalid attribute on the container.
  const split = new SplitText(target, { type: "words", aria: "none" });
  gsap.from(split.words, {
    opacity: opts.from ?? 0.15,
    duration: duration.reveal,
    ease: ease.reveal,
    stagger: opts.stagger ?? stagger.words,
    scrollTrigger: opts.scrollTrigger,
  });
  return split;
}

export function wordScrub(
  timeline: gsap.core.Timeline,
  target: Element,
  opts: WordScrubOptions = {},
): SplitText {
  // See `wordFadeIn` above: "none" instead of SplitText's default "auto" — every
  // caller targets a `<p>`, which can't validly carry `aria-label`.
  const split = new SplitText(target, { type: "words", aria: "none" });
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

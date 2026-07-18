/**
 * Rule A — SplitText char blur-in (spec §6 "text-effect rules", §9 blur budget).
 *
 *   blur(12px)→0, y:40→0, opacity 0→1 · stagger `stagger.chars` · ease.reveal
 *   (power3.out) · always `clearProps:"filter"` on complete.
 *
 * The ONE-SHOT reveal reserved for chapter headlines + the hero name — the only
 * places §9 permits a CSS `filter: blur` (besides the ghost loop). Never scrubbed,
 * never on paragraphs.
 *
 * Composition: call this inside a gsap context (a chapter's `connect`, which
 * ScrollStory invokes after `document.fonts.ready`). Pass `scrollTrigger` to fire
 * the reveal when the element enters (About/Safety headlines); omit it to fire on
 * creation (hero name "on load"). Returns the SplitText so the caller can revert it
 * on teardown (a gsap context does NOT revert SplitText's DOM — the caller must).
 */

import { gsap } from "gsap";
import type { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "./plugins";
import { ease, duration, stagger } from "@/lib/motion/tokens";

export interface BlurInOptions {
  /** Fire the reveal on scroll instead of on creation (one-shot; use `once: true`). */
  scrollTrigger?: ScrollTrigger.Vars;
  /** Override the per-char stagger (default `stagger.chars` = 0.03). */
  stagger?: number;
  /** Extra delay before the reveal (seconds). */
  delay?: number;
  /**
   * SplitText `type`. Default `"words,chars"`: chars animate for the blur-in while
   * being NESTED inside inline-block word wrappers, so a headline / the hero name can
   * only ever wrap at word boundaries — never mid-word (chars alone are inline and
   * break anywhere). Override only if you need a different granularity.
   */
  type?: string;
}

export interface BlurInHandle {
  split: SplitText;
  tween: gsap.core.Tween;
}

export function blurIn(target: Element, opts: BlurInOptions = {}): BlurInHandle {
  // `aria: "auto"` keeps the element readable to AT (labels the container with the
  // original text, hides the per-char spans) after the split. `words,chars` nests the
  // animated chars inside inline-block word wrappers → wraps only at word boundaries.
  const split = new SplitText(target, { type: opts.type ?? "words,chars", aria: "auto" });

  const tween = gsap.from(split.chars, {
    filter: "blur(12px)",
    y: 40,
    opacity: 0,
    duration: duration.reveal,
    ease: ease.reveal,
    stagger: opts.stagger ?? stagger.chars,
    delay: opts.delay,
    // §9 blur budget: drop the inline filter the instant the reveal finishes so no
    // blur lingers on the compositor.
    clearProps: "filter",
    scrollTrigger: opts.scrollTrigger,
  });

  return { split, tween };
}

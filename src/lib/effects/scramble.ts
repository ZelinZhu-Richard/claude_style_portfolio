/**
 * Rule D — ScrambleText one-shot (spec §6). For risk chips, stat labels, HUD act
 * names. NEVER scrubbed — it plays through once when triggered.
 *
 * Composition: call inside a gsap context. By default it scrambles TO the target's
 * existing text (set the final text in the DOM, then call `scramble(el)`); pass
 * `text` to reveal different copy. Pass `scrollTrigger` to fire on scroll, or call
 * imperatively (e.g. from a chapter's `pulseAt` at a local progress).
 *
 * Importing this module registers ScrambleTextPlugin (via ./plugins) so the
 * `scrambleText` tween property resolves.
 */

import { gsap } from "gsap";
import type { ScrollTrigger } from "gsap/ScrollTrigger";
import { duration as durations } from "@/lib/motion/tokens";
import "./plugins"; // side-effect: register ScrambleTextPlugin (browser-guarded)

export interface ScrambleOptions {
  /** Final text to scramble to (defaults to the element's current textContent). */
  text?: string;
  /** Character set used while scrambling. */
  chars?: string;
  /** Duration in seconds (default `duration.reveal` = 0.6). */
  duration?: number;
  /** Fire on scroll instead of on creation. */
  scrollTrigger?: ScrollTrigger.Vars;
  /** Delay before scrambling (seconds). */
  delay?: number;
}

export function scramble(target: Element, opts: ScrambleOptions = {}): gsap.core.Tween {
  const text = opts.text ?? target.textContent ?? "";
  return gsap.to(target, {
    duration: opts.duration ?? durations.reveal,
    ease: "none",
    delay: opts.delay,
    scrollTrigger: opts.scrollTrigger,
    scrambleText: {
      text,
      chars: opts.chars ?? "upperCase",
      speed: 1,
    },
  });
}

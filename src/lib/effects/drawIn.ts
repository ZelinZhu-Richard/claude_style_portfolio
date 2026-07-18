/**
 * Shared stroke-draw helper (spec §4 "DrawSVG-ready" illustrations, §6 DrawSVG
 * moments). The single entry point for animating an inline SVG's strokes "on" with
 * DrawSVGPlugin — matching the plain-function effects API (see effects/index.ts) so
 * chapters call it inside their `connect`, exactly like `rise` / `wordScrub`.
 *
 * It sets `drawSVG` on EVERY drawable child of the target (path/line/polyline/
 * circle/ellipse/rect — round-cap node-dots are strokable circles, per §4) and
 * supports two composition modes, the same pair `rise` offers:
 *
 *  - WINDOWED on a chapter (or the loader) timeline: pass `timeline` + a
 *    `[position, end]` window. Like `rise`, step = duration = stagger =
 *    (end − position) / n, so the LAST stroke lands exactly on `end` — gap-free and
 *    guaranteed to stay inside the window, keeping the chapter timeline's
 *    totalDuration at 1 (assertNormalized stays quiet). Used for SafetyAct's
 *    scrub-mapped kill-criteria diagram (0.44–0.62) and shield (0.74–0.9), and for
 *    the loader's timed bezel/mark draws (window units are seconds there).
 *  - ONE-SHOT (real time): omit `timeline`; pass a `scrollTrigger` (or nothing to
 *    play on creation). `duration.cinematic`, `ease.reveal`, per-path stagger ~0.06.
 *
 * Reduced-motion: leaves every stroke fully drawn (no dash setup) and does nothing —
 * belt-and-suspenders, since chapter `connect`s are already desktop-only and the
 * loader takes its own reduced-motion path.
 */

import { gsap } from "gsap";
import type { ScrollTrigger } from "gsap/ScrollTrigger";
import { ease, duration as durations } from "@/lib/motion/tokens";
import "./plugins"; // side-effect: register DrawSVGPlugin (browser-guarded)

const DRAWABLE = "path, line, polyline, circle, ellipse, rect";

export interface DrawInOptions {
  /** Windowed mode: the timeline (chapter-normalized 0..1, or the loader's seconds). */
  timeline?: gsap.core.Timeline;
  /** Windowed mode: where on the timeline the first stroke begins. */
  position?: number;
  /** Windowed mode: where the LAST stroke finishes (defaults to `position + duration`). */
  end?: number;
  /** One-shot duration (default `duration.cinematic` = 1.0). */
  duration?: number;
  /** One-shot stagger between strokes (default 0.06). */
  stagger?: number;
  /** Ease. Windowed default `"none"` (linear scrub); one-shot default `ease.reveal`. */
  ease?: string;
  /** DrawSVG start value (default `0` = empty). */
  from?: number | string;
  /** One-shot mode: fire the draw on scroll. */
  scrollTrigger?: ScrollTrigger.Vars;
}

function drawables(target: Element): SVGElement[] {
  return gsap.utils.toArray<SVGElement>(target.querySelectorAll(DRAWABLE));
}

/**
 * Draw an inline SVG's strokes on. Returns the created tween (one-shot) or the
 * timeline (windowed, for chaining), or `undefined` when there's nothing to draw /
 * reduced motion.
 */
export function drawIn(
  target: Element,
  opts: DrawInOptions = {},
): gsap.core.Tween | gsap.core.Timeline | undefined {
  const els = drawables(target);
  if (!els.length) return;

  // Reduced-motion: strokes stay fully drawn, no dash animation.
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const from = opts.from ?? 0;

  if (opts.timeline) {
    const start = opts.position ?? 0;
    const end = opts.end ?? start + (opts.duration ?? 0.1);
    const n = Math.max(els.length, 1);
    // Gap-free coverage of [start, end]: duration == stagger == step, last stroke
    // lands on `end` — same scheme as `rise`, so totalDuration never overruns.
    const step = Math.max((end - start) / n, 0.0001);
    opts.timeline.set(els, { drawSVG: from }, 0);
    return opts.timeline.to(
      els,
      { drawSVG: "100%", ease: opts.ease ?? "none", duration: step, stagger: step },
      start,
    );
  }

  gsap.set(els, { drawSVG: from });
  return gsap.to(els, {
    drawSVG: "100%",
    duration: opts.duration ?? durations.cinematic,
    ease: opts.ease ?? ease.reveal,
    stagger: opts.stagger ?? 0.06,
    scrollTrigger: opts.scrollTrigger,
  });
}

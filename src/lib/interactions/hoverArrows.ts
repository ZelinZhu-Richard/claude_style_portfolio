/**
 * Hover arrows (spec §8: "hand-drawn arrow DrawSVGs in on hover"). A generic wiring for
 * hoverable hosts (research index rows, the two big community cards): the `[data-hover-arrow]`
 * SVG inside a host draws in over 0.3s (`ease.reveal`) on enter and reverses out on leave.
 *
 * ONE delegated `pointerover`/`pointerout` pair on the host's container (same idiom as the
 * research-row highlight in ScrollStory) drives every arrow — no per-row listeners. Each
 * arrow's paused DrawSVG tween is created lazily and cached on a WeakMap, so nothing is
 * built until first hover. Reuses DrawSVGPlugin directly (registered via effects/plugins).
 *
 * Gated: no-ops unless the pointer is fine + hover-capable. Callers (chapter `connect`s)
 * already run desktop + motion-safe, so this belt-and-suspenders guard only rules out a
 * large no-hover touchscreen that happens to be ≥769px wide.
 */

import { gsap } from "gsap";
import { ease, duration } from "@/lib/motion/tokens";
import "@/lib/effects/plugins"; // side-effect: register DrawSVGPlugin (browser-guarded)

const DRAWABLE = "path, line, polyline, circle, ellipse, rect";

/**
 * Attach hover-arrow behaviour to every `hostSelector` element inside `root`.
 * @returns cleanup that removes the listeners and kills any created tweens.
 */
export function wireHoverArrows(root: Element, hostSelector: string): () => void {
  if (
    typeof window === "undefined" ||
    !window.matchMedia("(hover: hover) and (pointer: fine)").matches
  ) {
    return () => {};
  }

  // Arrows render `opacity-0` by default (so coarse-pointer / reduced-motion users, whose
  // hover never draws them, never see them). Here — desktop only — reveal the element but
  // leave the strokes UNDRAWN, so the hover tween has something to draw in from empty.
  const arrows = gsap.utils.toArray<SVGElement>(root.querySelectorAll("[data-hover-arrow]"));
  arrows.forEach((a) => {
    gsap.set(a, { opacity: 1 });
    gsap.set(a.querySelectorAll(DRAWABLE), { drawSVG: 0 });
  });

  const tweens = new WeakMap<Element, gsap.core.Tween>();
  const created: gsap.core.Tween[] = [];

  const tweenFor = (arrow: Element): gsap.core.Tween | undefined => {
    const cached = tweens.get(arrow);
    if (cached) return cached;
    const strokes = gsap.utils.toArray<SVGElement>(arrow.querySelectorAll(DRAWABLE));
    if (!strokes.length) return undefined;
    const tw = gsap.to(strokes, {
      drawSVG: "100%",
      duration: duration.micro, // §8: 0.3s
      ease: ease.reveal,
      stagger: 0.05,
      paused: true,
    });
    tweens.set(arrow, tw);
    created.push(tw);
    return tw;
  };

  const arrowIn = (host: Element) => {
    const arrow = host.querySelector("[data-hover-arrow]");
    if (arrow) tweenFor(arrow)?.play();
  };
  const arrowOut = (host: Element) => {
    const arrow = host.querySelector("[data-hover-arrow]");
    if (arrow) tweens.get(arrow)?.reverse();
  };

  const onOver = (ev: PointerEvent) => {
    const host = (ev.target as HTMLElement | null)?.closest?.(hostSelector);
    const from = ev.relatedTarget as HTMLElement | null;
    // Only on the crossing INTO the host (ignore moves between the host's own children).
    if (host && !from?.closest?.(hostSelector)) arrowIn(host);
  };
  const onOut = (ev: PointerEvent) => {
    const host = (ev.target as HTMLElement | null)?.closest?.(hostSelector);
    const to = ev.relatedTarget as HTMLElement | null;
    if (host && host !== to?.closest?.(hostSelector)) arrowOut(host);
  };

  root.addEventListener("pointerover", onOver as EventListener, { passive: true });
  root.addEventListener("pointerout", onOut as EventListener, { passive: true });

  return () => {
    root.removeEventListener("pointerover", onOver as EventListener);
    root.removeEventListener("pointerout", onOut as EventListener);
    created.forEach((tw) => tw.kill());
    // Re-hide (back to the CSS default) so a torn-down context leaves nothing visible.
    arrows.forEach((a) => gsap.set(a, { opacity: 0 }));
  };
}

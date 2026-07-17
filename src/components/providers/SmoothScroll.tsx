"use client";

/**
 * SmoothScroll — mounts Lenis as the root smooth-scroller and wires it to GSAP's
 * ScrollTrigger using the canonical single-clock pattern (spec §11 "Lenis wiring"):
 *
 *   1. `lenis.on('scroll', ScrollTrigger.update)` — every Lenis scroll frame tells
 *      ScrollTrigger to re-evaluate (so pins/scrubs track the smoothed position).
 *   2. `gsap.ticker.add(t => lenis.raf(t * 1000))` — GSAP's ticker becomes the ONE
 *      clock driving Lenis's rAF loop (Lenis's own rAF is disabled via
 *      `autoRaf: false`). GSAP ticker time is seconds; Lenis wants ms, hence ×1000.
 *   3. `gsap.ticker.lagSmoothing(0)` — disable GSAP's lag smoothing so scrubbed
 *      tweens stay locked to scroll position and never "catch up" after a stall.
 *
 * Native scroll is preserved (Lenis rides the real scrollbar), so ScrollTrigger's
 * default `pinType: 'fixed'` is correct — we deliberately do NOT install a
 * scrollerProxy (spec §11 / risk table: scrollerProxy is what causes pin jumps).
 *
 * Consumers that need to drive scrolling programmatically (ChapterNav, Wordmark)
 * read the instance with `useLenis()` from `lenis/react` — they render inside this
 * provider, so no module-level singleton is needed.
 */

import { useEffect, useRef } from "react";
import { ReactLenis, type LenisRef } from "lenis/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register once. gsap.registerPlugin doesn't touch window, so this is SSR-safe even
// though this module is bundled to the client. ScrollTrigger, SplitText, DrawSVG and
// ScrambleText are all free (GSAP 3.13+), but only ScrollTrigger is needed this task.
gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    const lenis = lenisRef.current?.lenis;
    if (!lenis) return;

    // GSAP ticker is the single clock; feed its (seconds) time to Lenis (ms).
    const update = (time: number) => {
      lenis.raf(time * 1000);
    };

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.off("scroll", ScrollTrigger.update);
      gsap.ticker.remove(update);
    };
  }, []);

  return (
    <ReactLenis root options={{ lerp: 0.09, autoRaf: false }} ref={lenisRef}>
      {children}
    </ReactLenis>
  );
}

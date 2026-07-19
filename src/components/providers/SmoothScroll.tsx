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

import { useEffect } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register once. `ScrollTrigger.register` guards its own window access, so this is
// SSR-safe even though this module also executes during SSR. The Task-3 text plugins
// (SplitText, ScrambleText — free since GSAP 3.13) are registered separately in
// `lib/effects/plugins.ts` behind a `typeof window` guard, because SplitText.register
// reads `window.innerWidth` unguarded and would crash if registered here at SSR time.
gsap.registerPlugin(ScrollTrigger);

/**
 * Bridges the root Lenis instance to GSAP's ticker. Must render INSIDE
 * <ReactLenis> so `useLenis()` re-fires the effect once the instance exists.
 *
 * Why not read `lenisRef.current?.lenis` in a parent `useEffect(..., [])`?
 * ReactLenis creates its instance in a child useEffect and exposes it on the
 * ref via `useImperativeHandle(..., [lenis])` where `lenis` is React STATE —
 * the handle only carries the instance after the setLenis re-render commits,
 * which is AFTER the parent's initial effects pass. An empty-dep parent effect
 * therefore reads `undefined` exactly once and never retries, leaving Lenis
 * mounted (intercepting wheel/touch) but with no raf heartbeat: wheel and
 * touchpad scrolling freeze while keyboard scrolling (native, un-intercepted)
 * still works. `useLenis()` subscribes to the context state instead, so this
 * effect runs precisely when the instance becomes available.
 */
function LenisGsapBridge() {
  const lenis = useLenis();

  useEffect(() => {
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
  }, [lenis]);

  return null;
}

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis root options={{ lerp: 0.09, autoRaf: false }}>
      <LenisGsapBridge />
      {children}
    </ReactLenis>
  );
}

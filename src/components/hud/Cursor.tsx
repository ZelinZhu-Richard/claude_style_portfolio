"use client";

/**
 * Custom cursor (spec §8) — the desktop-pointer interaction layer.
 *
 * The Claude Code mascot follows the pointer, replacing both the OS cursor and the
 * earlier dot+ring pair. It sits on THREE nested nodes so the animations can never
 * fight over one transform:
 *   follow → x/y (instant, via quickSetter — this IS the cursor, so it must be precise)
 *   mode   → scale by what's under the pointer (idle 1 · hover 1.2 · magnetic 1.35)
 *   press  → scale while the button is held (squash 0.85, release pops to 1.08)
 * Nesting multiplies the two scales, so mode and press tween independently.
 *
 * Pressing also swaps the mascot's eyes to the happy chevrons. Both eye sets are
 * always in the DOM and are crossfaded through refs, so a click never triggers a
 * React re-render. The happy face is held a minimum of MIN_HAPPY_MS so even a very
 * fast click reads.
 *
 * States are resolved by ONE delegated `pointerover` (no per-element listeners).
 * The OS cursor is hidden (`cursor: none` on <body>) ONLY while this layer is
 * active. Never mounts on coarse pointers or reduced motion, and its
 * `pointer-events: none` overlay never blocks clicks nor traps focus.
 *
 * It is also the shared gate for the other fine-pointer / motion-safe polish: it
 * mounts the magnetic-CTA behaviour here so both share one `POLISH_QUERY` decision
 * + teardown.
 */

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ease } from "@/lib/motion/tokens";
import { initMagnetic, polishEnabled } from "@/lib/interactions";
import CursorMascot from "./CursorMascot";

const WIDTH = 44;
const HEIGHT = (WIDTH * 86) / 110; // keep the artwork's 110×86 aspect
const HALF_W = WIDTH / 2;
const HALF_H = HEIGHT / 2;

/** How long the happy face stays up, even if the click is shorter than this. */
const MIN_HAPPY_MS = 180;

const MODE_SCALE = { idle: 1, hover: 1.2, magnetic: 1.35 } as const;
type Mode = keyof typeof MODE_SCALE;

const HOVER_SELECTOR =
  'a, button, [role="button"], [data-project-row], [data-community-card], [data-institution]';

export default function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const followRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<HTMLDivElement>(null);
  const pressRef = useRef<HTMLDivElement>(null);
  const normalEyesRef = useRef<SVGGElement>(null);
  const happyEyesRef = useRef<SVGGElement>(null);

  // Decide once on mount (client-only; first render is null so SSR matches).
  useEffect(() => {
    if (polishEnabled()) setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const follow = followRef.current;
    const modeEl = modeRef.current;
    const pressEl = pressRef.current;
    const normalEyes = normalEyesRef.current;
    const happyEyes = happyEyesRef.current;
    if (!follow || !modeEl || !pressEl || !normalEyes || !happyEyes) return;

    // Hide the OS cursor only while the custom cursor is live.
    const prevCursor = document.body.style.cursor;
    document.body.style.cursor = "none";

    const setX = gsap.quickSetter(follow, "x", "px");
    const setY = gsap.quickSetter(follow, "y", "px");

    let mx = 0;
    let my = 0;
    let mode: Mode = "idle";
    // Start hidden so nothing flashes in the top-left corner before the first move
    // (the OS cursor is already `none`); revealed + snapped to the pointer in onMove.
    let hidden = true;
    gsap.set(follow, { autoAlpha: 0 });

    const setMode = (next: Mode) => {
      if (next === mode) return;
      mode = next;
      gsap.to(modeEl, { scale: MODE_SCALE[next], duration: 0.3, ease: ease.reveal });
    };

    // --- press ------------------------------------------------------------
    let downAt = 0;
    let revertTimer: number | null = null;
    let pressed = false;

    const clearRevert = () => {
      if (revertTimer !== null) {
        window.clearTimeout(revertTimer);
        revertTimer = null;
      }
    };

    const release = () => {
      revertTimer = null;
      gsap.to(happyEyes, { opacity: 0, duration: 0.12 });
      gsap.to(normalEyes, { opacity: 1, duration: 0.12 });
      gsap
        .timeline()
        .to(pressEl, { scale: 1.08, duration: 0.12, ease: ease.reveal })
        .to(pressEl, { scale: 1, duration: 0.18, ease: ease.reveal });
    };

    const onDown = () => {
      clearRevert();
      pressed = true;
      downAt = performance.now();
      gsap.to(happyEyes, { opacity: 1, duration: 0.08 });
      gsap.to(normalEyes, { opacity: 0, duration: 0.08 });
      gsap.to(pressEl, { scale: 0.85, duration: 0.12, ease: ease.reveal });
    };

    // Bound to the window so a release outside the viewport still resolves — and
    // `pointercancel` covers the pointer being taken away entirely.
    const onUp = () => {
      if (!pressed) return;
      pressed = false;
      const remaining = MIN_HAPPY_MS - (performance.now() - downAt);
      if (remaining > 0) revertTimer = window.setTimeout(release, remaining);
      else release();
    };

    // --- follow + delegation ---------------------------------------------
    const tick = () => {
      setX(mx - HALF_W);
      setY(my - HALF_H);
    };

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (hidden) {
        hidden = false;
        // Snap to the pointer before revealing so it never slides in from 0,0.
        gsap.set(follow, { x: mx - HALF_W, y: my - HALF_H });
        gsap.to(follow, { autoAlpha: 1, duration: 0.2 });
      }
    };

    // Recompute the mode from whatever is under the pointer: magnetic > hover >
    // idle (`pointerover` bubbles and fires on every entered element).
    const onOver = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t?.closest) return;
      if (t.closest("[data-magnetic]")) return setMode("magnetic");
      if (t.closest(HOVER_SELECTOR) || t.closest("[data-marquee-scroller]"))
        return setMode("hover");
      setMode("idle");
    };

    // Fade the layer out when the pointer leaves the window (re-shown on the next
    // pointermove — see onMove). One tween per crossing, not per event.
    const onWinOut = (e: PointerEvent) => {
      if (!e.relatedTarget && !hidden) {
        hidden = true;
        gsap.to(follow, { autoAlpha: 0, duration: 0.2 });
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerout", onWinOut, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    gsap.ticker.add(tick);

    const cleanupMagnetic = initMagnetic();

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerout", onWinOut);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      clearRevert();
      gsap.killTweensOf([follow, modeEl, pressEl, normalEyes, happyEyes]);
      cleanupMagnetic();
      document.body.style.cursor = prevCursor;
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[10001]">
      <div
        ref={followRef}
        className="absolute left-0 top-0"
        style={{ willChange: "transform", opacity: 0 }}
      >
        <div ref={modeRef} style={{ willChange: "transform" }}>
          <div ref={pressRef} style={{ willChange: "transform" }}>
            <CursorMascot
              width={WIDTH}
              normalEyesRef={normalEyesRef}
              happyEyesRef={happyEyesRef}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

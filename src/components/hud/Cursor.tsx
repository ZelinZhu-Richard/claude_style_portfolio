"use client";

/**
 * Custom cursor (spec §8) — the desktop-pointer interaction layer.
 *
 * An 8px ink dot that follows instantly + a 28px ring that trails (via `gsap.quickTo`).
 * States, resolved by ONE delegated `pointerover` (no per-element listeners, zero React
 * state per frame):
 *   - links / buttons / cards   → ring scales 1.6× with a terracotta-hot stroke
 *   - `[data-magnetic]`         → dot shrinks to 0, ring morphs to the element's rounded
 *                                 bounds (position tracked each frame so it hugs the
 *                                 magnetic pull), pill radius
 *   - the honors marquee        → ring shows a "→" glyph
 * Normal blend (no `difference`). The OS cursor is hidden (`cursor: none` on <body>) ONLY
 * while this layer is active. Never mounts on coarse pointers or reduced motion, and its
 * `pointer-events: none` overlay never blocks clicks nor traps focus.
 *
 * It is also the shared gate for the other fine-pointer / motion-safe polish: it mounts
 * the magnetic-CTA behaviour here so both share one `POLISH_QUERY` decision + teardown.
 */

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ease } from "@/lib/motion/tokens";
import { palette } from "@/lib/theme";
import { initMagnetic, polishEnabled } from "@/lib/interactions";

const RING = 28;
const HALF = RING / 2;
const HOVER_SELECTOR =
  'a, button, [role="button"], [data-project-row], [data-community-card], [data-institution]';

type Mode = "idle" | "hover" | "magnetic" | "marquee";

export default function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLSpanElement>(null);

  // Decide once on mount (client-only; first render is null so SSR matches).
  useEffect(() => {
    if (polishEnabled()) setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const ring = ringRef.current;
    const dot = dotRef.current;
    const arrow = arrowRef.current;
    if (!ring || !dot || !arrow) return;

    // Hide the OS cursor only while the custom cursor is live.
    const prevCursor = document.body.style.cursor;
    document.body.style.cursor = "none";

    const ringX = gsap.quickTo(ring, "x", { duration: 0.35, ease: ease.reveal });
    const ringY = gsap.quickTo(ring, "y", { duration: 0.35, ease: ease.reveal });
    const dotX = gsap.quickSetter(dot, "x", "px"); // instant follow
    const dotY = gsap.quickSetter(dot, "y", "px");

    let mx = 0;
    let my = 0;
    let mode: Mode = "idle";
    let magEl: HTMLElement | null = null;
    let hidden = false; // faded out while the pointer is off-window

    const setMode = (next: Mode, el: HTMLElement | null = null) => {
      if (next === mode && el === magEl) return;
      mode = next;
      magEl = el;
      const hot = next === "hover" || next === "magnetic";
      ring.style.borderColor = hot ? palette.terracottaHot : "var(--fg)";
      gsap.to(dot, { scale: next === "magnetic" ? 0 : 1, duration: 0.25, ease: ease.reveal });
      gsap.to(arrow, { opacity: next === "marquee" ? 1 : 0, duration: 0.2 });
      if (next === "magnetic" && el) {
        const r = el.getBoundingClientRect();
        gsap.to(ring, {
          scale: 1,
          width: r.width,
          height: r.height,
          borderRadius: 999,
          duration: 0.35,
          ease: ease.reveal,
        });
      } else {
        gsap.to(ring, {
          scale: next === "hover" ? 1.6 : next === "marquee" ? 1.15 : 1,
          width: RING,
          height: RING,
          borderRadius: 999,
          duration: 0.3,
          ease: ease.reveal,
        });
      }
    };

    // Per-frame: instant dot, trailing ring; in magnetic mode the ring tracks the
    // (moving) element's bounds. No allocation beyond one getBoundingClientRect.
    const tick = () => {
      if (mode === "magnetic" && magEl) {
        const r = magEl.getBoundingClientRect();
        ringX(r.left);
        ringY(r.top);
      } else {
        ringX(mx - HALF);
        ringY(my - HALF);
      }
      dotX(mx - 4);
      dotY(my - 4);
    };

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (hidden) {
        hidden = false;
        gsap.to([ring, dot], { autoAlpha: 1, duration: 0.2 });
      }
    };
    // Delegation: recompute the mode from whatever is under the pointer, magnetic >
    // marquee > hover > idle (pointerover bubbles and fires on every entered element).
    const onOver = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t?.closest) return;
      const mag = t.closest<HTMLElement>("[data-magnetic]");
      if (mag) return setMode("magnetic", mag);
      if (t.closest("[data-marquee-scroller]")) return setMode("marquee");
      if (t.closest(HOVER_SELECTOR)) return setMode("hover");
      setMode("idle");
    };
    // Fade the whole layer out when the pointer leaves the window (re-shown on the next
    // pointermove — see onMove). One tween per crossing, not per event.
    const onWinOut = (e: PointerEvent) => {
      if (!e.relatedTarget && !hidden) {
        hidden = true;
        gsap.to([ring, dot], { autoAlpha: 0, duration: 0.2 });
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerout", onWinOut, { passive: true });
    gsap.ticker.add(tick);

    const cleanupMagnetic = initMagnetic();

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerout", onWinOut);
      gsap.killTweensOf([ring, dot, arrow]);
      cleanupMagnetic();
      document.body.style.cursor = prevCursor;
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[10001]">
      <div
        ref={ringRef}
        className="absolute left-0 top-0 flex items-center justify-center rounded-full"
        style={{
          width: RING,
          height: RING,
          border: "1.5px solid var(--fg)",
          borderColor: "var(--fg)",
          transition: "border-color 0.2s linear",
          willChange: "transform",
        }}
      >
        <span
          ref={arrowRef}
          className="font-[family-name:var(--font-mono)] text-xs text-[color:var(--fg)]"
          style={{ opacity: 0 }}
        >
          →
        </span>
      </div>
      <div
        ref={dotRef}
        className="absolute left-0 top-0 rounded-full bg-[color:var(--fg)]"
        style={{ width: 8, height: 8, willChange: "transform" }}
      />
    </div>
  );
}

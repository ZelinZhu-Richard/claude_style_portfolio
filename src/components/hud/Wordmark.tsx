"use client";

/**
 * Wordmark — "Z—Z" monogram, fixed top-left (spec §8). A single click scrolls smoothly
 * to the top via Lenis.
 *
 * Easter egg (Task 6 / §8): 5 clicks within ~3s make the constellation briefly morph
 * into a spark/asterisk glyph (2.5s, eases back) and print a styled console line. The
 * spark is driven by `scrollState.overrideSpark`, a top-layer blend the constellation
 * honours WITHOUT touching its from→to handoff — so it reverts cleanly no matter how the
 * user scrolls during the 2.5s.
 *
 * Click behaviour (so 5 clicks don't scroll 5 times): only the FIRST click of a burst
 * scrolls to top; rapid follow-ups within 600ms are treated as burst clicks and suppress
 * the scroll. Normal (spaced-out) clicks each start a fresh burst, so they always scroll.
 */

import { useEffect, useRef } from "react";
import { useLenis } from "lenis/react";
import { gsap } from "gsap";
import { scrollState } from "@/lib/scroll-state";
import { NodeBlossom } from "@/components/illustrations";

const BURST_MS = 600; // clicks closer than this are the same burst → suppress re-scroll
const WINDOW_MS = 3000; // §8: 5 clicks within ~3s
const NEEDED = 5;

export default function Wordmark() {
  const lenis = useLenis();
  const clicks = useRef<number[]>([]);
  const lastClick = useRef(0);
  const eggTl = useRef<gsap.core.Timeline | null>(null);

  // Kill any in-flight spark tween on unmount and reset the shared field.
  useEffect(
    () => () => {
      eggTl.current?.kill();
      scrollState.overrideSpark = 0;
    },
    [],
  );

  const fireEgg = () => {
    // Payoff line for everyone (§8) — olive, mono, %c-styled.
    console.log(
      "%cvisitor session risk-scored: LOW — approved by human ✓",
      "color:#7D8A6C;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;letter-spacing:0.04em",
    );
    // The visual morph is motion; skip it under reduced motion (the constellation also
    // ignores overrideSpark when it built with reduced=true — double-safe).
    const motionSafe = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
    if (!motionSafe || eggTl.current) return; // no overlap while one is running
    eggTl.current = gsap
      .timeline({
        onComplete: () => {
          scrollState.overrideSpark = 0;
          eggTl.current = null;
        },
      })
      .to(scrollState, { overrideSpark: 1, duration: 0.5, ease: "power2.out" })
      .to(scrollState, { overrideSpark: 0, duration: 0.6, ease: "power2.inOut" }, "+=1.4"); // 2.5s total
  };

  const onClick = () => {
    const now = performance.now();
    // Only the first click of a burst scrolls to top (avoids 5 scrolls on the egg burst).
    if (now - lastClick.current > BURST_MS) lenis?.scrollTo(0, { immediate: false });
    lastClick.current = now;

    const recent = clicks.current.filter((t) => now - t < WINDOW_MS);
    recent.push(now);
    clicks.current = recent;
    if (recent.length >= NEEDED) {
      clicks.current = []; // reset so it re-arms rather than re-firing every extra click
      fireEgg();
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Scroll to top"
      className="hud hud--top hud--left label inline-flex items-center gap-2 text-[color:var(--fg)] text-base tracking-[0.08em] bg-transparent border-0 cursor-pointer"
    >
      {/* The site mark ① — inherits --fg so it flips with the act theme. */}
      <NodeBlossom className="h-5 w-5 text-[color:var(--fg)]" />
      Z—Z
    </button>
  );
}

"use client";

/**
 * Loader — the timed entry sequence (spec §6 Ch0, ~2.4s). A full-viewport fixed
 * cream panel ABOVE everything (z above the HUD and the grain), it plays the §6
 * beats then wipes up to hand off to the hero.
 *
 * Sequence (first visit, motion OK):
 *   0.0–0.6s  bezel rectangle DrawSVGs (its OWN copy — see BEZEL below)
 *   0.3–1.1s  node-blossom mark ① DrawSVGs (terracotta, 2px)
 *   0.9–1.6s  "ZELIN ZHU" chars rise in a per-char mask
 *   1.2–2.0s  mono counter 00→100, microcopy `drawing the constellation — NN%`
 *   2.0–2.6s  panel exits `clip-path: inset(0 0 100% 0)` (ease.cine / expo.inOut)
 *   2.3s      HERO HANDOFF — `fireLoaderDone()` (exit − 0.3s, 0.3s overlap, no dead
 *             frame; the hero's paused blur-in plays from here — see loader-signal.ts)
 *
 * BEZEL coordination (§8): the real `<Bezel>` is always mounted behind this panel.
 * The loader draws ITS OWN pixel-matched rectangle (measured from the viewport, inset
 * 12px / r24 like `.bezel`) so the frame appears to "ink itself in"; when the panel
 * wipes away it dissolves into the identical static bezel underneath. Simplest correct
 * approach (the real bezel is a CSS-border div, not an addressable SVG path).
 *
 * SKIP (revisit): `sessionStorage` gate → the component renders nothing (no flash)
 * and fires the handoff immediately, so the hero reveals exactly as it would have.
 *
 * SAFETY: scroll is locked with `lenis.stop()` for the full sequence and ALWAYS
 * released in cleanup (`lenis.start()`); a 4s hard timeout force-completes if fonts
 * or anything stall, so the user is never trapped. Reduced motion → a 0.6s fade, no
 * scroll lock. `useLenis()` gives the instance the same way ScrollStory-side HUD does.
 */

import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { SplitText } from "@/lib/effects/plugins";
import { drawIn } from "@/lib/effects";
import { ease } from "@/lib/motion/tokens";
import { fireLoaderDone } from "@/lib/loader-signal";
import { isMobile } from "@/lib/interactions";
import { NodeBlossom } from "@/components/illustrations";

const KEY = "z-loader-seen";
const LOADER_NAME = "Zelin Zhu"; // §6 "ZELIN ZHU" (label style uppercases it)
// §6 counter 00→100 climbing milestones (passes 47%, the spec's example microcopy).
const COUNTER_STEPS = ["12", "31", "47", "68", "85", "100"] as const;

type Phase = "idle" | "play" | "reduced" | "gone";

export default function Loader() {
  const lenis = useLenis();
  const [phase, setPhase] = useState<Phase>("idle");
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Decide once on mount: skip (revisit) → render nothing + hand off now; else play
  // (or reduced-motion fade). Runs client-only, so the SSR/first frame renders null
  // and a revisit never flashes a panel.
  useEffect(() => {
    let seen = false;
    try {
      seen = !!sessionStorage.getItem(KEY);
    } catch {
      /* private mode / storage disabled — treat as first visit */
    }
    if (seen) {
      fireLoaderDone();
      return;
    }
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setDims({ w: window.innerWidth, h: window.innerHeight });
    // Reduced-motion (§9) AND mobile (§10) both take the short ≤0.8s fade with NO scroll
    // lock — the full ~2.4s pinned sequence is a desktop-only entrance. `isMobile()` unifies
    // detection with ScrollStory / Scene (coarse pointer OR <768px).
    const shortFade =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches || isMobile();
    setPhase(shortFade ? "reduced" : "play");
  }, []);

  useGSAP(
    () => {
      if (phase === "idle" || phase === "gone") return;
      const root = rootRef.current;
      if (!root) return;

      let split: SplitText | undefined;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        fireLoaderDone(); // idempotent; also fired at 2.3s in the play timeline
        lenis?.start();
        setPhase("gone"); // unmount
      };

      // ARM THE UNLOCK BEFORE LOCKING. The 4s failsafe is registered first, so if
      // anything in the build below throws (`new SplitText`, `drawIn`, scramble) the
      // idempotent `finish` still fires and releases scroll — we never lock without an
      // already-armed unlock. The try/catch also unlocks immediately on a throw.
      const timeout = window.setTimeout(finish, 4000);

      try {
        if (phase === "reduced") {
          fireLoaderDone(); // hero (if it were gated) reveals during the fade
          gsap.to(root, { autoAlpha: 0, duration: 0.6, ease: ease.cine, onComplete: finish });
        } else {
          // Full sequence locks scroll (reduced-motion fade does not, §6). Locked only
          // AFTER the failsafe above is armed.
          if (phase === "play") lenis?.stop();

          const tl = gsap.timeline({ onComplete: finish });
          const bezel = root.querySelector<SVGElement>("[data-loader-bezel]");
          const blossom = root.querySelector<HTMLElement>("[data-loader-blossom]");
          const name = root.querySelector<HTMLElement>("[data-loader-name]");
          const num = root.querySelector<HTMLElement>("[data-loader-num]");

          if (bezel) drawIn(bezel, { timeline: tl, position: 0, end: 0.6, ease: ease.reveal });
          if (blossom) drawIn(blossom, { timeline: tl, position: 0.3, end: 1.1, ease: ease.reveal });

          if (name) {
            split = new SplitText(name, { type: "chars", mask: "chars" });
            tl.from(
              split.chars,
              { yPercent: 120, duration: 0.7, ease: ease.reveal, stagger: 0.04 },
              0.9,
            );
          }

          if (num) {
            // §6 counter 00→100 with ScrambleText numerals: the value climbs through
            // milestones (count-up progression) and each transition scrambles its
            // digits, landing on 100 exactly at 2.0s.
            const stepDur = 0.8 / COUNTER_STEPS.length;
            COUNTER_STEPS.forEach((val, i) =>
              tl.to(
                num,
                { duration: stepDur, ease: "none", scrambleText: { text: val, chars: "0123456789", speed: 1 } },
                1.2 + i * stepDur,
              ),
            );
          }

          // Panel wipes up, revealing the (already animating) hero beneath.
          tl.to(root, { clipPath: "inset(0 0 100% 0)", duration: 0.6, ease: ease.cine }, 2.0);
          // Hero handoff at exit − 0.3s.
          tl.call(fireLoaderDone, undefined, 2.3);
        }
      } catch {
        finish(); // any build error → release scroll + unmount immediately
      }

      return () => {
        window.clearTimeout(timeout);
        split?.revert();
        lenis?.start(); // ALWAYS unlock scroll on teardown
      };
    },
    { dependencies: [phase, dims], scope: rootRef },
  );

  if (phase === "idle" || phase === "gone") return null;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[color:var(--paper)]"
      style={{ clipPath: "inset(0 0 0% 0)" }}
    >
      {phase === "play" && dims ? (
        <svg
          data-loader-bezel
          width={dims.w}
          height={dims.h}
          viewBox={`0 0 ${dims.w} ${dims.h}`}
          className="pointer-events-none absolute inset-0"
          fill="none"
          stroke="rgba(20,20,19,0.28)"
          strokeWidth={1}
        >
          <rect x={12} y={12} width={dims.w - 24} height={dims.h - 24} rx={24} ry={24} />
        </svg>
      ) : null}

      <div className="flex flex-col items-center gap-6">
        <div data-loader-blossom className="h-24 w-24 text-[color:var(--terracotta)]">
          <NodeBlossom strokeWidth={2} className="h-full w-full" />
        </div>

        {/* per-char mask (SplitText mask:"chars"); overflow-hidden here is belt-and-braces */}
        <div className="overflow-hidden">
          <h2
            data-loader-name
            className="label m-0 text-[color:var(--ink)] text-lg tracking-[0.18em]"
          >
            {LOADER_NAME}
          </h2>
        </div>

        {/* §6 microcopy is lowercase ("drawing the constellation — 47%") — mono +
            tracking, but NOT the `.label` uppercase transform. Only the numerals scramble. */}
        <p
          data-loader-counter
          className="font-[family-name:var(--font-mono)] text-xs tracking-[0.08em] text-[color:var(--ink)] opacity-60"
        >
          drawing the constellation — <span data-loader-num className="tabular-nums">00</span>%
        </p>
      </div>
    </div>
  );
}

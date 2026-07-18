"use client";

/**
 * ProgressCounter — the mono scroll-% readout, fixed top-right (spec §8).
 *
 * Reads `scrollState.pageProgress` on the GSAP ticker and writes the value straight
 * to `ref.textContent` — deliberately NO React state per frame. The displayed value
 * is lerped toward the target at 0.1/frame (§8) so it eases rather than snaps.
 *
 * At a chapter boundary (§8) it ScrambleTexts the % into the new chapter's act label,
 * holds ~1.2s, then scrambles back to the %. The scramble tween owns `textContent` for
 * its duration (the ticker yields via `holding`); a new boundary while one is running
 * kills the previous timeline first, so rapid crossings never stack overlapping tweens.
 * Under reduced motion the effect degrades to the plain label swap (no scramble).
 */

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { scrollState } from "@/lib/scroll-state";
import { CHAPTERS } from "@/lib/scroll-map";
import "@/lib/effects/plugins"; // side-effect: register ScrambleTextPlugin (browser-guarded)

const LABEL_HOLD_MS = 1200; // §8: show the act name ~1.2s at a boundary

export default function ProgressCounter() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const motionSafe = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
    let shown = 0; // lerped display value, 0..1
    let lastChapter = scrollState.chapter;
    let labelUntil = 0; // reduced-motion plain-swap window
    let holding = false; // true while a scramble timeline owns textContent
    let scrambleTl: gsap.core.Timeline | null = null;

    const pctString = () =>
      `${String(Math.round(gsap.utils.clamp(0, 1, shown) * 100)).padStart(2, "0")}%`;

    const startScramble = (el: HTMLSpanElement, label: string) => {
      if (scrambleTl) scrambleTl.kill(); // guard: never stack overlapping crossings
      const backTo = pctString(); // shown is frozen while holding, so this stays valid
      holding = true;
      scrambleTl = gsap.timeline({
        onComplete: () => {
          holding = false;
          scrambleTl = null;
        },
      });
      scrambleTl
        .to(el, { duration: 0.5, ease: "none", scrambleText: { text: label, chars: "upperCase" } })
        .to(
          el,
          { duration: 0.5, ease: "none", scrambleText: { text: backTo, chars: "upperCase" } },
          "+=0.3",
        );
    };

    const tick = () => {
      const el = ref.current;
      if (!el) return;

      const now = performance.now();
      if (scrollState.chapter !== lastChapter) {
        lastChapter = scrollState.chapter;
        const chapter = CHAPTERS[scrollState.chapter - 1];
        if (chapter) {
          if (motionSafe) startScramble(el, chapter.actLabel);
          else labelUntil = now + LABEL_HOLD_MS;
        }
      }

      if (holding) return; // scramble tween is writing textContent

      if (now < labelUntil) {
        const chapter = CHAPTERS[lastChapter - 1];
        el.textContent = chapter ? chapter.actLabel : "";
        return;
      }

      shown += (scrollState.pageProgress - shown) * 0.1; // lerp 0.1/frame (§8)
      el.textContent = pctString();
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      scrambleTl?.kill();
    };
  }, []);

  return (
    <div className="hud hud--top hud--right label text-[color:var(--fg)] text-xs tabular-nums">
      <span ref={ref}>00%</span>
    </div>
  );
}

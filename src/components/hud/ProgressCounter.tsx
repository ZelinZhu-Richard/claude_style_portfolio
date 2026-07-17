"use client";

/**
 * ProgressCounter — the mono scroll-% readout, fixed top-right (spec §8).
 *
 * Reads `scrollState.pageProgress` on the GSAP ticker and writes the value straight
 * to `ref.textContent` — deliberately NO React state per frame. The displayed value
 * is lerped toward the target at 0.1/frame (§8) so it eases rather than snaps.
 *
 * At a chapter boundary it briefly (1.2s, §8) swaps the % for the new chapter's act
 * label, then returns to the percentage. This is the simple swap the brief calls
 * for; the ScrambleText transition into/out of the act name is a Task-6 seam.
 */

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { scrollState } from "@/lib/scroll-state";
import { CHAPTERS } from "@/lib/scroll-map";

const LABEL_HOLD_MS = 1200; // §8: show the act name ~1.2s at a boundary

export default function ProgressCounter() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let shown = 0; // lerped display value, 0..1
    let lastChapter = scrollState.chapter;
    let labelUntil = 0;

    const tick = () => {
      const el = ref.current;
      if (!el) return;

      const now = performance.now();
      if (scrollState.chapter !== lastChapter) {
        lastChapter = scrollState.chapter;
        // Boundary crossed: hold the act label briefly. TODO(Task 6): ScrambleText.
        const chapter = CHAPTERS[scrollState.chapter - 1];
        if (chapter) labelUntil = now + LABEL_HOLD_MS;
      }

      if (now < labelUntil) {
        const chapter = CHAPTERS[lastChapter - 1];
        el.textContent = chapter ? chapter.actLabel : "";
        return;
      }

      shown += (scrollState.pageProgress - shown) * 0.1; // lerp 0.1/frame (§8)
      const pct = Math.round(gsap.utils.clamp(0, 1, shown) * 100);
      el.textContent = `${String(pct).padStart(2, "0")}%`;
    };

    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <div className="hud hud--top hud--right label text-[color:var(--fg)] text-xs tabular-nums">
      <span ref={ref}>00%</span>
    </div>
  );
}

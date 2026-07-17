"use client";

/**
 * Wordmark — "Z—Z" monogram, fixed top-left (spec §8). Clicking scrolls smoothly
 * to the top via Lenis.
 *
 * Seam (Task 6): the 5×-click easter egg (constellation morphs to a spark glyph,
 * console "visitor session risk-scored: LOW — approved by human ✓"). The onClick
 * stays a plain scroll-to-top for now; the click-counter hook layers on later.
 */

import { useLenis } from "lenis/react";

export default function Wordmark() {
  const lenis = useLenis();

  const toTop = () => {
    // TODO(Task 6): count clicks → 5× triggers the spark-glyph easter egg.
    lenis?.scrollTo(0, { immediate: false });
  };

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Scroll to top"
      className="hud hud--top hud--left label text-[color:var(--fg)] text-base tracking-[0.08em] bg-transparent border-0 cursor-pointer"
    >
      Z—Z
    </button>
  );
}

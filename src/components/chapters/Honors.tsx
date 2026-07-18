"use client";

/**
 * Chapter 6 — Honors (spec §6 ch6). A flowing 100vh band (NOT pinned): a mono label
 * plus two rows of large OUTLINED display type. This task ships the STATIC band; the
 * velocity-coupled marquee MOTION is Task 5, so the DOM is already shaped as the
 * scroller Task 5 will animate — each row is `overflow-hidden` wrapping a flex
 * `[data-marquee-scroller]` whose item sequence is DUPLICATED (the second copy is
 * `aria-hidden`) for a seamless loop.
 *
 * It has no pinned timeline; like Contact, it exposes the `ChapterHandle` and
 * ScrollStory calls `connect()` (no timeline) after fonts.ready inside its desktop
 * matchMedia context. `connect` builds only the one-shot Rule C rise on enter; under
 * reduced motion `connect` is never called, so the band renders statically readable.
 */

import { useImperativeHandle, useRef } from "react";
import { rise } from "@/lib/effects";
import { stagger } from "@/lib/motion/tokens";
import { honors } from "@/content/chapters";
import type { ChapterHandle } from "./chapter-handle";

// Two counter-scrolling rows (§6): split the honors into two halves so each marquee
// carries distinct copy.
const HALF = Math.ceil(honors.items.length / 2);
const ROWS: readonly (readonly string[])[] = [
  honors.items.slice(0, HALF),
  honors.items.slice(HALF),
];

export default function Honors({ ref }: { ref?: React.Ref<ChapterHandle> }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    connect() {
      const root = rootRef.current;
      if (!root) return;
      // Rule C — the outlined items rise once as the band enters (one-shot, staggered).
      const items = root.querySelectorAll<HTMLElement>("[data-honor]");
      rise(items, {
        stagger: stagger.rows,
        scrollTrigger: { trigger: root, start: "top 80%", once: true },
      });
      // No SplitText here — nothing to revert.
    },
  }));

  return (
    <div
      ref={rootRef}
      className="relative flex min-h-screen w-full flex-col justify-center gap-10 overflow-hidden py-16 text-[color:var(--fg)]"
    >
      <p className="label px-8 text-xs text-[color:var(--fg)] opacity-60">{honors.label}</p>

      {ROWS.map((rowItems, rowIndex) => (
        // Marquee row: overflow-hidden viewport wrapping the scroller. Task 5 animates
        // `[data-marquee-scroller]`'s x (base 40px/s; the two rows counter-scroll; the
        // timeScale couples to scroll velocity). Static here — no transform yet.
        <div key={rowIndex} className="w-full overflow-hidden">
          <div
            data-marquee-scroller
            data-row={rowIndex}
            className="flex w-max items-center gap-x-10 whitespace-nowrap will-change-transform"
          >
            {/* Two copies of the sequence for a seamless loop; the duplicate is hidden
                from assistive tech so items are not announced twice. */}
            {[false, true].map((isDuplicate) =>
              rowItems.map((item, i) => (
                <span
                  key={`${isDuplicate ? "dup" : "primary"}-${i}`}
                  data-honor
                  aria-hidden={isDuplicate ? "true" : undefined}
                  className="text-outline font-[family-name:var(--font-display)] font-medium uppercase leading-none tracking-[-0.02em] text-[clamp(2.5rem,7vw,5.5rem)]"
                >
                  {item}
                </span>
              )),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

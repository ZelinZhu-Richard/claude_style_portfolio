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
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { rise } from "@/lib/effects";
import { stagger } from "@/lib/motion/tokens";
import { honors } from "@/content/chapters";
import type { ChapterHandle } from "./chapter-handle";

const DRIFT = 40; // §6: base drift 40px/s

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

      // ---- Velocity-coupled marquee (§6 ch6) ----
      // connect runs ONLY in ScrollStory's desktop matchMedia context, so this motion
      // is desktop-only by construction; under reduced-motion / mobile the band stays
      // the statically-readable wrapped list (both sequences already in the DOM).
      const scrollers = gsap.utils.toArray<HTMLElement>(root.querySelectorAll("[data-marquee-scroller]"));
      const loops: gsap.core.Tween[] = [];
      scrollers.forEach((scroller, rowIndex) => {
        const kids = scroller.children;
        const half = kids.length / 2;
        if (half < 1) return;
        // One period = the x-distance between a copy-1 item and its copy-2 twin, i.e.
        // the full width of one sequence INCLUDING the inter-copy gap. Looping x by
        // exactly this makes the wrap invisible (the two copies are identical), so the
        // seam never jumps regardless of the flex gap.
        const period = (kids[half] as HTMLElement).offsetLeft - (kids[0] as HTMLElement).offsetLeft;
        if (!period) return;
        // Row 0 drifts left (0 → −period); row 1 counter-scrolls right (−period → 0).
        const leftward = rowIndex % 2 === 0;
        gsap.set(scroller, { x: leftward ? 0 : -period });
        loops.push(
          gsap.to(scroller, {
            x: leftward ? -period : 0,
            duration: period / DRIFT,
            ease: "none",
            repeat: -1,
          }),
        );
      });

      // Shared timeScale: base 1, pushed by scroll velocity (clamped ±4), relaxing to
      // 1 at ~0.05/frame. A negative timeScale reverses BOTH rows, so they keep
      // counter-scrolling while the whole band's direction-feel flips with scroll.
      let ts = 1;
      const velTrigger = ScrollTrigger.create({
        onUpdate: (self) => {
          ts = gsap.utils.clamp(-4, 4, 1 + gsap.utils.clamp(-4, 4, self.getVelocity() / 300));
        },
      });
      const relax = () => {
        ts += (1 - ts) * 0.05; // ease back to base drift
        loops.forEach((tw) => tw.timeScale(ts));
      };
      gsap.ticker.add(relax);

      // gsap.ticker is not managed by ScrollStory's gsap.context — remove it here.
      return () => {
        gsap.ticker.remove(relax);
        velTrigger.kill();
        loops.forEach((tw) => tw.kill());
      };
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

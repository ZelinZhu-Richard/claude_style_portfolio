"use client";

/**
 * ChapterNav — the pill nav (About · Safety · Community · Work · Contact, spec §8).
 * Clicking a chapter scrolls to its section via Lenis. Below 768px it collapses to
 * a single menu toggle (§10).
 *
 * Active state is a simple class driven off `scrollState.chapter`, sampled on the
 * GSAP ticker and committed to React state ONLY when the active chapter actually
 * changes (~4 times per full scroll, per §11) — never per frame.
 *
 * Seams (Task 6): the sliding active capsule (0.35s power3.out) and the 4px
 * terracotta active dot. Here the active item just gets `data-active` / a class.
 */

import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { gsap } from "gsap";
import { CHAPTERS } from "@/lib/scroll-map";
import { scrollState } from "@/lib/scroll-state";

const NAV_ITEMS = CHAPTERS.filter((c) => c.navInNav);

export default function ChapterNav() {
  const lenis = useLenis();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  // Reflect the active chapter without per-frame re-renders: the ticker reads the
  // plain scroll-state object and only calls setState when the index changes.
  useEffect(() => {
    const tick = () => {
      if (scrollState.chapter !== activeRef.current) {
        activeRef.current = scrollState.chapter;
        setActive(scrollState.chapter);
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  const go = (id: string) => {
    lenis?.scrollTo(`#chapter-${id}`, { immediate: false });
    setOpen(false);
  };

  return (
    <nav
      className="hud hud--top hud--center"
      aria-label="Chapter navigation"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="md:hidden label text-[color:var(--fg)] text-xs px-4 py-2 rounded-[var(--radius-pill)] border border-[color:var(--hairline)] bg-[color:var(--bg)] cursor-pointer"
      >
        {open ? "Close" : "Menu"}
      </button>

      <ul
        className={`${
          open ? "flex" : "hidden"
        } md:flex flex-col md:flex-row gap-1 md:gap-1 mt-2 md:mt-0 items-stretch md:items-center rounded-[var(--radius-pill)] md:border md:border-[color:var(--hairline)] md:bg-[color:var(--bg)] md:px-1.5 md:py-1`}
      >
        {NAV_ITEMS.map((c) => {
          const isActive = active === c.index;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => go(c.id)}
                data-active={isActive}
                aria-current={isActive ? "true" : undefined}
                className={`label text-xs px-3 py-1.5 rounded-[var(--radius-pill)] cursor-pointer transition-colors ${
                  isActive
                    ? "text-[color:var(--terracotta-hot)]"
                    : "text-[color:var(--fg)] opacity-70 hover:opacity-100"
                }`}
              >
                {c.navLabel ?? c.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

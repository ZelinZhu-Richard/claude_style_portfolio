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
 * Task 6: a capsule background (`[data-nav-capsule]`) slides (transform x/y + measured
 * width/height, 0.35s power3.out) to the hovered item and returns to the active item on
 * leave; every item keeps a 4px terracotta active dot. The capsule is gated to
 * desktop-width + hover + motion-safe (coarse / reduced / the mobile menu never get it);
 * the dot is a static indicator shown in every mode. Re-measures on resize.
 */

import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { gsap } from "gsap";
import { ease } from "@/lib/motion/tokens";
import { CHAPTERS } from "@/lib/scroll-map";
import { scrollState } from "@/lib/scroll-state";

const NAV_ITEMS = CHAPTERS.filter((c) => c.navInNav);
const CAPSULE_MQ = "(min-width: 769px) and (hover: hover) and (prefers-reduced-motion: no-preference)";

export default function ChapterNav() {
  const lenis = useLenis();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const listRef = useRef<HTMLUListElement>(null);
  const capsuleRef = useRef<HTMLSpanElement>(null);
  const firstPlace = useRef(true);

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

  // Sliding capsule (Task 6). Re-runs on active change so the capsule follows the active
  // chapter while scrolling; wires hover/leave/resize. Snaps on first mount, slides after.
  useEffect(() => {
    const ul = listRef.current;
    const cap = capsuleRef.current;
    if (!ul || !cap) return;
    if (!window.matchMedia(CAPSULE_MQ).matches) return; // no capsule for coarse/reduced

    const activeBtn = () => ul.querySelector<HTMLElement>('[data-nav-item][data-active="true"]');
    const place = (el: HTMLElement | null, animate: boolean) => {
      if (!el) return;
      // Measure against the ul's padding box (getBoundingClientRect + clientLeft/Top
      // accounts for the ul's border), so it is independent of offsetParent quirks.
      const u = ul.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      const to = {
        x: b.left - u.left - ul.clientLeft,
        y: b.top - u.top - ul.clientTop,
        width: b.width,
        height: b.height,
      };
      if (animate) gsap.to(cap, { ...to, duration: 0.35, ease: ease.reveal, autoAlpha: 1 });
      else gsap.set(cap, { ...to, autoAlpha: 1 });
    };

    place(activeBtn(), !firstPlace.current);
    firstPlace.current = false;

    const onOver = (e: PointerEvent) => {
      const btn = (e.target as HTMLElement | null)?.closest?.<HTMLElement>("[data-nav-item]");
      if (btn) place(btn, true);
    };
    const onLeave = () => place(activeBtn(), true);
    const onResize = () => place(activeBtn(), false); // re-measure, no animation

    ul.addEventListener("pointerover", onOver, { passive: true });
    ul.addEventListener("pointerleave", onLeave, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      ul.removeEventListener("pointerover", onOver);
      ul.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, [active]);

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
        ref={listRef}
        className={`${
          open ? "flex" : "hidden"
        } md:flex relative flex-col md:flex-row gap-1 md:gap-1 mt-2 md:mt-0 items-stretch md:items-center rounded-[var(--radius-pill)] md:border md:border-[color:var(--hairline)] md:bg-[color:var(--bg)] md:px-1.5 md:py-1`}
      >
        {/* Sliding capsule — behind the items (z-0); the effect positions/animates it. */}
        <span
          ref={capsuleRef}
          aria-hidden="true"
          data-nav-capsule
          className="pointer-events-none absolute left-0 top-0 z-0 hidden rounded-[var(--radius-pill)] md:block"
          style={{ opacity: 0, backgroundColor: "color-mix(in srgb, var(--fg) 8%, transparent)" }}
        />
        {NAV_ITEMS.map((c) => {
          const isActive = active === c.index;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => go(c.id)}
                data-nav-item
                data-active={isActive}
                aria-current={isActive ? "true" : undefined}
                className={`label relative z-[1] text-xs px-3 py-1.5 rounded-[var(--radius-pill)] cursor-pointer transition-colors ${
                  isActive
                    ? "text-[color:var(--terracotta-hot)]"
                    : "text-[color:var(--fg)] opacity-70 hover:opacity-100"
                }`}
              >
                {c.navLabel ?? c.label}
                {/* 4px terracotta active dot (§8) — static, shown in every mode. */}
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[color:var(--terracotta)]"
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

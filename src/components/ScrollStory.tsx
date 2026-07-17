"use client";

/**
 * ScrollStory — the animation spine (spec §6 scroll map, §9 motion rules, §11
 * architecture). It owns the 8-chapter* `<main>` and, inside one `gsap.context`
 * (via `useGSAP`, scoped to the main ref), builds:
 *
 *  - per-chapter pinned ScrollTriggers (desktop), each an empty scrubbed timeline
 *    that Task 3 hangs its content beats on, writing chapter state to `scroll-state`
 *  - the background act crossfade (cream → ink → cream) over the §6 vh windows
 *  - a global page-progress trigger for the HUD %
 *  - a reduced-motion / mobile fallback with no pins (flow) but a safe color fade
 *  - pointer parallax → `scroll-state` (Task 4's useFrame reads it)
 *
 * This is the SPINE only: no canvas, no real chapter DOM, no text-effect plugins.
 * `TODO(Task N)` marks each seam where a later effect attaches.
 *
 * (*7 narrative sections here; §6 counts the timed Loader as chapter 0 — it is not
 * a scrolled section and lands in Task 5.)
 */

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CHAPTERS, CREAM_TO_INK, INK_TO_CREAM, type ChapterDef } from "@/lib/scroll-map";
import { scrollState, type Formation } from "@/lib/scroll-state";
import { palette } from "@/lib/theme";

type ThemeColors = { bg: string; fg: string };

// The two theme end-states the background crossfades between (spec §4/§6).
const CREAM: ThemeColors = { bg: palette.paper, fg: palette.ink };
const DARK: ThemeColors = { bg: palette.ink, fg: palette.creamGhost };

// matchMedia queries (spec §9 reduced-motion map / §10 mobile).
const DESKTOP = "(min-width: 769px) and (prefers-reduced-motion: no-preference)";
const REDUCED = "(prefers-reduced-motion: reduce), (max-width: 768px)";

export default function ScrollStory() {
  const mainRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = document.documentElement;
      ScrollTrigger.config({ ignoreMobileResize: true }); // §9 hygiene

      // ---- writers: mutate the plain bridge object; zero React re-renders ----
      const setActive = (index: number, from: Formation, to: Formation) => {
        scrollState.chapter = index; // discrete (§11): only on chapter change
        scrollState.formationFrom = from;
        scrollState.formationTo = to;
      };
      const drive = (c: ChapterDef, from: Formation, to: Formation, progress: number) => {
        if (scrollState.chapter !== c.index) return; // only the active chapter writes
        scrollState.chapterProgress = progress;
        scrollState.morph = from === to ? 1 : progress; // →Task 4 GPU morph uProgress
        // About: the nebula "holds its breath" — noiseAmp eases 0.15 → 0.04 (§6 ch2).
        if (c.id === "about") scrollState.noiseAmp = gsap.utils.interpolate(0.15, 0.04, progress);
      };
      const paint = (from: ThemeColors, to: ThemeColors, p: number) => {
        // Single CSS-var paint = single page repaint (§9). GSAP interpolates the colors.
        root.style.setProperty("--bg", gsap.utils.interpolate(from.bg, to.bg, p) as string);
        root.style.setProperty("--fg", gsap.utils.interpolate(from.fg, to.fg, p) as string);
      };
      // A non-pinned chapter tracker: sets the active chapter on enter and drives its
      // progress. Shared by desktop's flowing chapters and every reduced-motion chapter.
      const trackChapter = (el: HTMLElement, c: ChapterDef, from: Formation, to: Formation) =>
        ScrollTrigger.create({
          trigger: el,
          start: "top center",
          end: "bottom center",
          onEnter: () => setActive(c.index, from, to),
          onEnterBack: () => setActive(c.index, from, to),
          onUpdate: (self) => drive(c, from, to, self.progress),
        });

      // ---- global page progress (both modes; drives the HUD %) ----
      // `end` MUST be a function so it re-measures on every refresh: the 5 pins add
      // pin-spacers that ~double the document height AFTER this trigger is created,
      // and Task 3 will change content height again. `refreshPriority: -1` forces this
      // to refresh AFTER the (priority-0) pins have applied their spacers, so
      // maxScroll is the final value (a plain `end:"bottom bottom"` here measured the
      // pre-spacer height and froze at half the story).
      ScrollTrigger.create({
        start: 0,
        end: () => ScrollTrigger.maxScroll(window),
        invalidateOnRefresh: true,
        refreshPriority: -1,
        onUpdate: (self) => {
          scrollState.pageProgress = self.progress;
        },
      });

      const mm = gsap.matchMedia();

      // ============ DESKTOP: pins + scrubbed crossfade + parallax ============
      mm.add(DESKTOP, () => {
        setActive(CHAPTERS[0].index, CHAPTERS[0].formation, CHAPTERS[0].formation);

        CHAPTERS.forEach((c, i) => {
          const el = document.getElementById(`chapter-${c.id}`);
          if (!el) return;
          const from: Formation = i === 0 ? c.formation : CHAPTERS[i - 1].formation;
          const to = c.formation;
          const pinned = c.pin === true || c.pin === "partial";

          if (pinned) {
            // 100vh baseline (the pinned viewport) + (vh − 100)% pin spacer = the §6
            // budget, so each chapter's footprint equals its vh and Σ = 1400vh
            // (TOTAL_VH). The brief's shorthand `end:"+=160%"` omits that 100vh
            // baseline and would overshoot 1400 — §6's budget is the binding value.
            gsap.timeline({
              scrollTrigger: {
                trigger: el,
                start: "top top",
                end: `+=${c.vh - 100}%`,
                pin: true,
                scrub: c.scrub ?? true,
                invalidateOnRefresh: true,
                onEnter: () => setActive(c.index, from, to),
                onEnterBack: () => setActive(c.index, from, to),
                onUpdate: (self) => drive(c, from, to, self.progress),
                onToggle: (self) => {
                  // will-change hygiene (§9): add on pin enter, drop on leave.
                  el.style.willChange = self.isActive ? "transform" : "";
                },
              },
            });
            // TODO(Task 3): attach this chapter's scrubbed rule A/B/C beats to the timeline.
          } else {
            // Honors (flows) + Contact (sticky-reveal): no pin, still drive state.
            trackChapter(el, c, from, to);
          }
        });

        // Act crossfade — scrubbed over the §6 vh windows as absolute scroll px.
        const vhPx = () => window.innerHeight / 100;
        ScrollTrigger.create({
          start: () => CREAM_TO_INK[0] * vhPx(),
          end: () => CREAM_TO_INK[1] * vhPx(),
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            paint(CREAM, DARK, self.progress);
            root.dataset.theme = self.progress >= 0.5 ? "dark" : "light"; // flip at midpoint
          },
        });
        ScrollTrigger.create({
          start: () => INK_TO_CREAM[0] * vhPx(),
          end: () => INK_TO_CREAM[1] * vhPx(),
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            paint(DARK, CREAM, self.progress);
            root.dataset.theme = self.progress >= 0.5 ? "light" : "dark";
          },
        });

        // Pointer parallax → scroll-state (rAF-throttled; Task 4's useFrame lerps it).
        let queued = false;
        let px = 0;
        let py = 0;
        const onMove = (e: PointerEvent) => {
          px = (e.clientX / window.innerWidth) * 2 - 1;
          py = (e.clientY / window.innerHeight) * 2 - 1;
          if (queued) return;
          queued = true;
          requestAnimationFrame(() => {
            scrollState.pointer.x = px;
            scrollState.pointer.y = py;
            queued = false;
          });
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        return () => window.removeEventListener("pointermove", onMove);
      });

      // ============ REDUCED-MOTION / MOBILE: flow, no pins, 0.4s bg fade ============
      // Basic correct fallback (full mobile choreography is Task 7, per §10).
      mm.add(REDUCED, () => {
        setActive(CHAPTERS[0].index, CHAPTERS[0].formation, CHAPTERS[0].formation);
        const els: HTMLElement[] = [];

        CHAPTERS.forEach((c, i) => {
          const el = document.getElementById(`chapter-${c.id}`);
          if (!el) return;
          els.push(el);
          gsap.set(el, { minHeight: `${c.vh}vh` }); // flow height = §6 budget (no pins)
          const from: Formation = i === 0 ? c.formation : CHAPTERS[i - 1].formation;
          trackChapter(el, c, from, c.formation);
        });

        // Color fade is safe under reduced-motion (§9): keep it, but as a quick 0.4s
        // tween at the act boundaries rather than scroll-scrubbed.
        const fade = (to: ThemeColors, dark: boolean) => {
          const from = dark ? CREAM : DARK;
          root.dataset.theme = dark ? "dark" : "light";
          const proxy = { t: 0 };
          gsap.to(proxy, {
            t: 1,
            duration: 0.4, // §9 reduced-motion: color crossfade kept at 0.4s (spec-literal)
            ease: "none",
            overwrite: true,
            onUpdate: () => paint(from, to, proxy.t),
          });
        };
        const safety = document.getElementById("chapter-safety");
        const community = document.getElementById("chapter-community");
        if (safety)
          ScrollTrigger.create({
            trigger: safety,
            start: "top center",
            onEnter: () => fade(DARK, true),
            onLeaveBack: () => fade(CREAM, false),
          });
        if (community)
          ScrollTrigger.create({
            trigger: community,
            start: "top center",
            onEnter: () => fade(CREAM, false),
            onLeaveBack: () => fade(DARK, true),
          });

        return () => gsap.set(els, { clearProps: "minHeight" });
      });

      // Re-measure pins once fonts settle (§9/§14) — avoids font-swap mis-measurement.
      document.fonts?.ready.then(() => ScrollTrigger.refresh());

      return () => mm.revert();
    },
    { scope: mainRef },
  );

  return (
    <main ref={mainRef} className="relative z-10">
      {CHAPTERS.map((c) => {
        const Heading = c.index === 1 ? "h1" : "h2";
        return (
          <section
            key={c.id}
            id={`chapter-${c.id}`}
            aria-label={c.label}
            data-chapter={c.index}
            className="chapter relative flex min-h-screen flex-col items-center justify-center gap-4 px-8 text-center"
          >
            <p className="label text-xs text-[color:var(--terracotta)]">{c.actLabel}</p>
            <Heading className="display text-[color:var(--fg)]">{c.label}</Heading>
            <p className="label text-xs text-[color:var(--fg)] opacity-50">
              Chapter {c.index} placeholder
            </p>
          </section>
        );
      })}
    </main>
  );
}

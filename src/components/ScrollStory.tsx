"use client";

/**
 * ScrollStory — the animation spine (spec §6 scroll map, §9 motion rules, §11
 * architecture). It owns the 8-chapter* `<main>` and, inside one `gsap.context`
 * (via `useGSAP`, scoped to the main ref), builds:
 *
 *  - per-chapter pinned ScrollTriggers (desktop), each an empty scrubbed timeline
 *    that a chapter component hangs its content beats on, writing chapter state to
 *    `scroll-state`
 *  - the background act crossfade (cream → ink → cream) over the §6 vh windows
 *  - a global page-progress trigger for the HUD %
 *  - THREE mutually-exclusive matchMedia contexts (Task 7): DESKTOP (full 1400vh pinned
 *    choreography), MOBILE (§10 motion-safe cinematic — Hero unpinned, Safety a shortened
 *    240vh pin, the rest flowing with one-shot reveals, element-anchored crossfades), and
 *    REDUCED (§9 static map, 0.4s Rule-A fades). They are exhaustive and gap-free, so the
 *    exact-768px boundary never leaves choreography CSS hiding content no JS reveals.
 *  - pointer parallax → `scroll-state` (Task 4's useFrame reads it)
 *
 * CHAPTER HANDOFF (Task 3): ScrollStory still owns section shells, pins, tracking,
 * crossfades, and formation writes. All seven chapters render real components that
 * expose a `ChapterHandle` (React-19 `ref` + `useImperativeHandle`). After
 * `document.fonts.ready` — inside the DESKTOP matchMedia context, so the work is
 * reverted with it — ScrollStory calls each chapter's `connect` via `context.add`.
 * PINNED chapters (Hero, About, Safety, Community, Research) receive their pinned
 * scrubbed timeline; FLOW / sticky chapters (Honors, Contact) receive no argument and
 * build only on-enter one-shots. Each chapter returns a cleanup that reverts its
 * SplitText.
 *
 * RESEARCH PIN SPLIT (Task 3b): Research is `pin: "partial"` (§6 "120 pin + 100
 * flow"). ScrollStory pins only its inner `[data-pin-stage]` element (not the whole
 * section) for the `pinVh` (120vh) portion; the sibling flow block then scrolls
 * normally for the remaining 100vh. The two spend Research's 220vh budget, so the
 * document total stays exactly 1400vh.
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
import Hero from "@/components/chapters/Hero";
import About from "@/components/chapters/About";
import SafetyAct from "@/components/chapters/SafetyAct";
import Community from "@/components/chapters/Community";
import Research from "@/components/chapters/Research";
import Honors from "@/components/chapters/Honors";
import ContactFooter from "@/components/chapters/ContactFooter";
import type { ChapterHandle } from "@/components/chapters/chapter-handle";

type ThemeColors = { bg: string; fg: string };

// The two theme end-states the background crossfades between (spec §4/§6).
const CREAM: ThemeColors = { bg: palette.paper, fg: palette.ink };
const DARK: ThemeColors = { bg: palette.ink, fg: palette.creamGhost };

// ── matchMedia contexts (spec §9 reduced-motion / §10 mobile) ────────────────────
// Three mutually-exclusive, EXHAUSTIVE contexts — no width/pointer combination falls
// through a gap (the "exact-768px seam" the brief calls out), so the choreography CSS
// (`motion-safe:`) and the `desktop:` custom variant are always paired with a JS context
// that reveals what they hide:
//
//   REDUCED  = reduce (any width)                    → §9 static map, 0.4s Rule-A fades
//   DESKTOP  = no-pref ∧ ≥768px ∧ not-coarse         → full 1400vh pinned choreography
//   MOBILE   = no-pref ∧ (<768px ∨ coarse pointer)   → §10 mobile cinematic (short pins)
//
// DESKTOP's `min-width:768` matches Tailwind's `md` (768px) and the `desktop:` custom
// variant defined in globals.css, so the desktop-only pinned-viewport CSS engages exactly
// where the desktop JS context does. Safety's beat-swap gating is `motion-safe:` (both
// DESKTOP and MOBILE call `connect`, so it is revealed in both; REDUCED never hides it).
//
// MOBILE's width term is `not (min-width: 768px)` — the EXACT complement of DESKTOP's
// `min-width: 768px`, NOT `max-width: 767px`. `max-width:767` and `min-width:768` leave the
// open interval (767px, 768px) — reachable at fractional CSS widths via browser zoom /
// fractional DPR — matching NEITHER context, so no `connect()` fires and Safety's
// motion-safe-hidden beats stay invisible (the exact seam this task eliminates). `not
// (min-width:768px)` ≡ `width < 768px` is total: every width is either <768 (→MOBILE) or
// ≥768 (→DESKTOP), with 768.0 owned by DESKTOP. (MQ Level 4 `not`; verified in Chromium.)
// Exhaustiveness for no-preference: coarse→MOBILE, fine/none ≥768→DESKTOP, anything
// <768→MOBILE; DESKTOP requires not-coarse, so a coarse device ≥768 is MOBILE, never both.
const REDUCED = "(prefers-reduced-motion: reduce)";
const DESKTOP =
  "(min-width: 768px) and (not (pointer: coarse)) and (prefers-reduced-motion: no-preference)";
const MOBILE =
  "(prefers-reduced-motion: no-preference) and (not (min-width: 768px)), (prefers-reduced-motion: no-preference) and (pointer: coarse)";

// §10 mobile scroll budgets (vh). Hero unpins (natural 100vh, load animation only);
// About + Community + Research + Honors + Contact flow at natural height; ONLY Safety
// keeps its pin — the core act — shortened 400→240vh. New total ≈ 850vh (vs desktop's
// invariant 1400vh, which applies to DESKTOP only). Background crossfades are re-derived
// as element-anchored triggers (below), not the desktop absolute-px windows.
const MOBILE_SAFETY_VH = 240;

export default function ScrollStory() {
  const mainRef = useRef<HTMLElement>(null);

  // Chapter handles: ScrollStory hands each real chapter its pinned timeline (pinned
  // chapters) or calls connect() with no argument (flow / sticky chapters) after
  // fonts settle. All seven chapters have a handle.
  const heroRef = useRef<ChapterHandle>(null);
  const aboutRef = useRef<ChapterHandle>(null);
  const safetyRef = useRef<ChapterHandle>(null);
  const communityRef = useRef<ChapterHandle>(null);
  const researchRef = useRef<ChapterHandle>(null);
  const honorsRef = useRef<ChapterHandle>(null);
  const contactRef = useRef<ChapterHandle>(null);

  useGSAP(
    () => {
      const root = document.documentElement;
      ScrollTrigger.config({ ignoreMobileResize: true }); // §9 hygiene

      const chapterHandles: Record<string, React.RefObject<ChapterHandle | null>> = {
        hero: heroRef,
        about: aboutRef,
        safety: safetyRef,
        community: communityRef,
        research: researchRef,
        honors: honorsRef,
        contact: contactRef,
      };

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
        // NOTE: About's noiseAmp 0.15→0.04 (§6 ch2) now lives as a scrubbed tween on
        // About's chapter timeline (About.connect), so Task 4 reads it off the same
        // clock as the rest of that chapter's beats — no longer written here.
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
      mm.add(DESKTOP, (context) => {
        setActive(CHAPTERS[0].index, CHAPTERS[0].formation, CHAPTERS[0].formation);

        // Chapters awaiting a `connect` after fonts settle. Pinned chapters carry
        // their scrubbed timeline; flow / sticky chapters (Honors, Contact) carry none.
        const connects: Array<{ id: string; timeline?: gsap.core.Timeline }> = [];

        CHAPTERS.forEach((c, i) => {
          const el = document.getElementById(`chapter-${c.id}`);
          if (!el) return;
          const from: Formation = i === 0 ? c.formation : CHAPTERS[i - 1].formation;
          const to = c.formation;
          const partial = c.pin === "partial";
          const pinned = c.pin === true || partial;

          if (pinned) {
            // For a PARTIAL pin (Research, §6 "120 pin + 100 flow"), pin only the
            // inner `[data-pin-stage]` element for its `pinVh` portion and let the
            // sibling flow block scroll after it. For a FULL pin, pin the whole
            // section for its `vh`. Either way: 100vh baseline (the pinned viewport)
            // + (footprint − 100)% pin spacer = the §6 budget, so each chapter's
            // on-screen footprint equals its vh and Σ = 1400vh (TOTAL_VH). Research's
            // flow block supplies the remaining (vh − pinVh) in natural document flow.
            const pinTarget = partial
              ? el.querySelector<HTMLElement>("[data-pin-stage]") ?? el
              : el;
            const pinFootprint = partial ? c.pinVh ?? c.vh : c.vh;
            const timeline = gsap.timeline({
              scrollTrigger: {
                trigger: pinTarget,
                start: "top top",
                end: `+=${pinFootprint - 100}%`,
                pin: pinTarget,
                scrub: c.scrub ?? true,
                invalidateOnRefresh: true,
                onEnter: () => setActive(c.index, from, to),
                onEnterBack: () => setActive(c.index, from, to),
                onUpdate: (self) => drive(c, from, to, self.progress),
                onToggle: (self) => {
                  // will-change hygiene (§9): add on pin enter, drop on leave.
                  pinTarget.style.willChange = self.isActive ? "transform" : "";
                },
              },
            });
            if (chapterHandles[c.id]) connects.push({ id: c.id, timeline });
          } else {
            // Honors (flows) + Contact (sticky-reveal): no pin, still drive state and
            // still receive a connect() (no timeline) so they build on-enter reveals.
            trackChapter(el, c, from, to);
            if (chapterHandles[c.id]) connects.push({ id: c.id });
          }
        });

        // Hand each real chapter its connect once fonts settle (§9/§14): SplitText
        // must run after `document.fonts.ready`. `context.add` collects the chapter's
        // tweens/triggers into THIS matchMedia context so they revert with it; connect
        // returns a SplitText-revert cleanup we run on teardown.
        const cleanups: Array<() => void> = [];
        document.fonts.ready.then(() => {
          if (context.isReverted) return;
          context.add(() => {
            connects.forEach(({ id, timeline }) => {
              const cleanup = chapterHandles[id]?.current?.connect(timeline);
              if (cleanup) cleanups.push(cleanup);
            });
          });
          ScrollTrigger.refresh();
        });

        // Act crossfade — scrubbed over the §6 vh windows as absolute scroll px.
        const vhPx = () => window.innerHeight / 100;
        ScrollTrigger.create({
          start: () => CREAM_TO_INK[0] * vhPx(),
          end: () => CREAM_TO_INK[1] * vhPx(),
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            paint(CREAM, DARK, self.progress);
            scrollState.themeBlend = self.progress; // Task 4: canvas lerps in lockstep
            root.dataset.theme = self.progress >= 0.5 ? "dark" : "light"; // flip at midpoint
          },
        });
        ScrollTrigger.create({
          start: () => INK_TO_CREAM[0] * vhPx(),
          end: () => INK_TO_CREAM[1] * vhPx(),
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            paint(DARK, CREAM, self.progress);
            scrollState.themeBlend = 1 - self.progress; // dark act → cream
            root.dataset.theme = self.progress >= 0.5 ? "light" : "dark";
          },
        });

        // Research row hover seam (§6 ch5 / §7 `uHighlight[5]`): a delegated
        // pointer listener maps the `[data-project-row]` under the cursor to a moon
        // 0..4 that the constellation brightens. Delegation (one listener) keeps it
        // cheap; the canvas reads `scrollState.highlightMoon` in useFrame.
        const onRowOver = (ev: PointerEvent) => {
          const row = (ev.target as HTMLElement | null)?.closest?.("[data-project-row]");
          const raw = row?.getAttribute("data-project-row");
          scrollState.highlightMoon = raw == null ? -1 : Number(raw) % 5;
        };
        const onRowOut = (ev: PointerEvent) => {
          const to = ev.relatedTarget as HTMLElement | null;
          if (!to?.closest?.("[data-project-row]")) scrollState.highlightMoon = -1;
        };
        window.addEventListener("pointerover", onRowOver, { passive: true });
        window.addEventListener("pointerout", onRowOut, { passive: true });

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
        return () => {
          cleanups.forEach((fn) => fn()); // revert chapter SplitText instances
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerover", onRowOver);
          window.removeEventListener("pointerout", onRowOut);
        };
      });

      // ============ MOBILE (motion-safe): §10 cinematic — short pins, flow, fades =====
      // A REAL mobile experience (distinct from reduced-motion): Hero unpins with its
      // load blur-in, Safety keeps a shortened 240vh pin (the core act, all three beats
      // swapping), and About / Community / Research / Honors / Contact flow with one-shot
      // reveals. Chapters build their §10 variant via connect(timeline?, { mobile:true }):
      // Rule B word-scrubs become one-shot staggered fades, the Honors marquee drifts at a
      // constant speed, Rule A blur-ins / counters / chip scrambles are kept.
      //
      // ABOUT stays a FLOW section on mobile (not the §10 120vh pin): its stacked content
      // — headline, paragraph, 6 stat tiles, 2 cards — exceeds a phone viewport, and a pin
      // would fix it taller-than-screen and clip the lower half. Flowing it keeps every
      // stat + card reachable while still revealing on enter (documented deviation). Safety
      // pins cleanly because only one beat is on screen at a time (absolute-stacked swap).
      mm.add(MOBILE, (context) => {
        setActive(CHAPTERS[0].index, CHAPTERS[0].formation, CHAPTERS[0].formation);

        const connects: Array<{ id: string; timeline?: gsap.core.Timeline }> = [];

        CHAPTERS.forEach((c, i) => {
          const el = document.getElementById(`chapter-${c.id}`);
          if (!el) return;
          const from: Formation = i === 0 ? c.formation : CHAPTERS[i - 1].formation;
          const to = c.formation;

          if (c.id === "safety") {
            // The one mobile pin (§10): full-section pin, shortened to 240vh. Local
            // progress still runs 0→1, so the chapter's beat anchors (0.4 / 0.72 swaps,
            // chip pulses) map straight onto the shorter footprint (deferred item #8).
            const timeline = gsap.timeline({
              scrollTrigger: {
                trigger: el,
                start: "top top",
                end: `+=${MOBILE_SAFETY_VH - 100}%`,
                pin: el,
                scrub: c.scrub ?? true,
                invalidateOnRefresh: true,
                onEnter: () => setActive(c.index, from, to),
                onEnterBack: () => setActive(c.index, from, to),
                onUpdate: (self) => drive(c, from, to, self.progress),
                onToggle: (self) => {
                  el.style.willChange = self.isActive ? "transform" : "";
                },
              },
            });
            connects.push({ id: c.id, timeline });
          } else {
            // Everything else flows at natural height; still drive chapter/formation state
            // for the constellation morph, and still receive a mobile connect() reveal.
            trackChapter(el, c, from, to);
            connects.push({ id: c.id });
          }
        });

        // Hand each chapter its MOBILE build after fonts settle (SplitText needs fonts).
        const cleanups: Array<() => void> = [];
        document.fonts.ready.then(() => {
          if (context.isReverted) return;
          context.add(() => {
            connects.forEach(({ id, timeline }) => {
              const cleanup = chapterHandles[id]?.current?.connect(timeline, { mobile: true });
              if (cleanup) cleanups.push(cleanup);
            });
          });
          ScrollTrigger.refresh();
        });

        // Background act crossfades — ELEMENT-ANCHORED (§10), not the desktop absolute-px
        // windows. cream→ink scrubs as Safety enters (completing before it pins at top);
        // ink→cream scrubs as Community enters. themeBlend + the theme flip ride along so
        // the canvas and bezel stay in lockstep, exactly like desktop.
        const safety = document.getElementById("chapter-safety");
        const community = document.getElementById("chapter-community");
        if (safety)
          ScrollTrigger.create({
            trigger: safety,
            start: "top 85%",
            end: "top 35%",
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              paint(CREAM, DARK, self.progress);
              scrollState.themeBlend = self.progress;
              root.dataset.theme = self.progress >= 0.5 ? "dark" : "light";
            },
          });
        if (community)
          ScrollTrigger.create({
            trigger: community,
            start: "top 85%",
            end: "top 35%",
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              paint(DARK, CREAM, self.progress);
              scrollState.themeBlend = 1 - self.progress;
              root.dataset.theme = self.progress >= 0.5 ? "light" : "dark";
            },
          });

        return () => cleanups.forEach((fn) => fn());
      });

      // ============ REDUCED-MOTION (any width): §9 static map, 0.4s Rule-A fades =======
      // Chapters render at their natural full-opacity CSS state (connect is never called
      // here), so all content is statically readable; ScrollStory adds only the §9-mandated
      // 0.4s Rule-A opacity fades on the chapter headlines and the safe 0.4s colour fade at
      // the act boundaries. No pins, no scrubs, no drift.
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

          // §9: rule A → a 0.4s opacity fade (NOT the blur-in, NOT instant). Fade each
          // chapter headline in once as it enters. Everything else is full-opacity static.
          const headline = el.querySelector<HTMLElement>("[data-rule-a]");
          if (headline)
            gsap.from(headline, {
              opacity: 0,
              duration: 0.4,
              ease: "none",
              scrollTrigger: { trigger: el, start: "top 85%", once: true },
            });
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
            onUpdate: () => {
              paint(from, to, proxy.t);
              scrollState.themeBlend = dark ? proxy.t : 1 - proxy.t; // canvas lockstep
            },
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
      {CHAPTERS.map((c) => (
        <section
          key={c.id}
          id={`chapter-${c.id}`}
          aria-label={c.label}
          data-chapter={c.index}
          className="chapter relative min-h-screen w-full"
        >
          {c.id === "hero" ? (
            <Hero ref={heroRef} />
          ) : c.id === "about" ? (
            <About ref={aboutRef} />
          ) : c.id === "safety" ? (
            <SafetyAct ref={safetyRef} chapter={c} />
          ) : c.id === "community" ? (
            <Community ref={communityRef} chapter={c} />
          ) : c.id === "research" ? (
            <Research ref={researchRef} chapter={c} />
          ) : c.id === "honors" ? (
            <Honors ref={honorsRef} />
          ) : (
            <ContactFooter ref={contactRef} />
          )}
        </section>
      ))}
    </main>
  );
}

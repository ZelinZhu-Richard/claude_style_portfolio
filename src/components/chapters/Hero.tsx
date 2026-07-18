"use client";

/**
 * Chapter 1 — Hero (spec §6 ch1). Renders the inner 100vh stage; ScrollStory owns
 * the `<section>` shell and the pin. Effects are built in `connect`, which
 * ScrollStory calls (after fonts.ready, inside its desktop matchMedia context) with
 * this chapter's scrubbed timeline. See chapter-handle.ts for the contract.
 *
 * Beats (local progress 0..1 == timeline time):
 *  - name (h1): Rule A blur-in on connect ("on load"); scrubbed letter-spacing
 *    0→0.06em + y→−8vh parallax across 0–1; opacity→0 across 0.8–1.0 (fades last).
 *  - tagline (the emotive headline): Rule B word-scrub across 0.15–0.55.
 *  - body + mono meta: Rule C rise on connect (a gentle load reveal).
 *  - "Keep scrolling" ghost: per-letter blur wave loop, CREATED on pin enter and
 *    KILLED on pin leave (§9 blur budget — no lingering blur off-stage).
 */

import { useImperativeHandle, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "@/lib/effects/plugins";
import { blurIn, rise, wordScrub } from "@/lib/effects";
import { ease, stagger } from "@/lib/motion/tokens";
import { hero } from "@/content/chapters";
import HeadlineText from "./HeadlineText";
import type { ChapterHandle } from "./chapter-handle";

// Component-local decoration (not narrative copy) — the brief permits mono/label
// motifs as local constants. The Task-5 loader will hand the hero its intro.
const GHOST_TEXT = "Keep scrolling";

export default function Hero({ ref }: { ref?: React.Ref<ChapterHandle> }) {
  const nameRef = useRef<HTMLHeadingElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLParagraphElement>(null);

  useImperativeHandle(ref, () => ({
    connect(timeline) {
      const pin = timeline.scrollTrigger;
      const name = nameRef.current;
      const tagline = taglineRef.current;
      const ghost = ghostRef.current;
      if (!pin || !name || !tagline || !ghost) return;

      // Local-progress anchor: pins timeline duration to 1 so time == local progress.
      timeline.to({ _p: 0 }, { _p: 1, duration: 1, ease: "none" }, 0);

      // Rule A — name blur-in "on load". TODO(Task 5): fire this from the loader's
      // exit seam (blur-in starts at 2.3s) instead of on connect.
      const nameSplit = blurIn(name).split;

      // Scrubbed name: letter-spacing 0→0.06em + y→−8vh parallax over the chapter,
      // then fades out across the last 20% (§6).
      timeline.to(name, { letterSpacing: "0.06em", y: "-8vh", ease: "none", duration: 1 }, 0);
      timeline.to(name, { opacity: 0, ease: "none", duration: 0.2 }, 0.8);

      // Rule B — tagline word-scrub, local 0.15–0.55.
      const taglineSplit = wordScrub(timeline, tagline, { start: 0.15, end: 0.55 });

      // Rule C — body + meta gentle load reveal (plays on connect).
      if (fadeRef.current) {
        rise(fadeRef.current.querySelectorAll("[data-hero-fade]"), {
          stagger: stagger.rows,
        });
      }

      // "Keep scrolling" ghost: per-letter blur wave, alive only while pinned.
      const ghostSplit = new SplitText(ghost, { type: "chars" });
      let ghostLoop: gsap.core.Tween | null = null;
      const makeGhost = () => {
        if (ghostLoop) return;
        ghostLoop = gsap.to(ghostSplit.chars, {
          filter: "blur(6px)",
          duration: 2.4,
          ease: ease.breathe, // sine.inOut
          stagger: 0.12,
          repeat: -1,
          yoyo: true,
        });
      };
      const killGhost = () => {
        ghostLoop?.kill();
        ghostLoop = null;
        gsap.set(ghostSplit.chars, { clearProps: "filter" }); // drop blur off the budget
      };
      // Dedicated trigger over the pin's range (the pin's own onToggle is spoken for
      // by ScrollStory's will-change hygiene). `makeGhost` is idempotent, so the
      // initial kick below plus the toggle can't stack loops.
      ScrollTrigger.create({
        start: () => pin.start,
        end: () => pin.end,
        onToggle: (self) => (self.isActive ? makeGhost() : killGhost()),
      });
      // onToggle does not fire for a trigger that is already active at creation, so
      // start the loop directly when the hero is the on-screen chapter (page top).
      if (window.scrollY < window.innerHeight) makeGhost();

      return () => {
        killGhost();
        nameSplit.revert();
        taglineSplit.revert();
        ghostSplit.revert();
      };
    },
  }));

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center gap-8 px-8 text-center motion-safe:md:h-screen motion-safe:md:min-h-0 motion-safe:md:overflow-hidden">
      <div className="flex flex-col items-center gap-6">
        <h1
          ref={nameRef}
          className="text-balance font-[family-name:var(--font-display)] font-medium uppercase leading-[0.95] tracking-normal text-[color:var(--fg)]"
          style={{ fontSize: "clamp(96px, 14vw, 220px)" }}
        >
          {hero.name}
        </h1>

        <p
          ref={taglineRef}
          className="font-[family-name:var(--font-display)] font-medium leading-tight tracking-[-0.02em] text-[color:var(--fg)] text-[clamp(1.5rem,4vw,3rem)]"
        >
          <HeadlineText headline={hero.headline} />
        </p>

        <div ref={fadeRef} className="flex flex-col items-center gap-4">
          {hero.body ? (
            <p
              data-hero-fade
              className="max-w-xl text-base text-[color:var(--fg)] opacity-80"
            >
              {hero.body}
            </p>
          ) : null}
          <p data-hero-fade className="label text-xs text-[color:var(--fg)] opacity-60">
            {hero.meta}
          </p>
        </div>
      </div>

      {/* "Keep scrolling" ghost, bottom-center. */}
      <p
        ref={ghostRef}
        aria-hidden="true"
        className="label pointer-events-none absolute bottom-[6vh] left-1/2 -translate-x-1/2 text-xs text-[color:var(--fg)] opacity-40"
      >
        {GHOST_TEXT}
      </p>
    </div>
  );
}

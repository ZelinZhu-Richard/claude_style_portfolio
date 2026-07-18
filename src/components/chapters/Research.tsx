"use client";

/**
 * Chapter 5 — Research & building (spec §6 ch5). This chapter is split (§6:
 * "120 pin + 100 flow"):
 *
 *  - a PINNED stage (`[data-pin-stage]`, the 100vh viewport ScrollStory pins for a
 *    120vh footprint) holding the headline + the institutions row, and
 *  - a NATURAL-FLOW block (`[data-research-flow]`, exactly 100vh) holding the project
 *    index rows, each of which rises once as it enters (not scrubbed).
 *
 * ScrollStory pins only the stage (it looks up `[data-pin-stage]` and pins that,
 * driving the pin `end` from `pinVh`), so the flow block scrolls normally after the
 * pin releases; the two together spend the §6 220vh budget (120 + 100) and the
 * document total stays exactly 1400vh.
 *
 * Beats:
 *  - headline (h2): Rule A blur-in on entering (one-shot).
 *  - sub: static serif (short — no scrub).
 *  - institutions row (4 cards): Rule C rise, scrubbed [0.2, 0.7] on the pinned timeline.
 *  - index rows: Rule C rise, one-shot per row on enter (`top 85%`), off the timeline.
 */

import { useImperativeHandle, useRef } from "react";
import { blurIn, drawIn, rise } from "@/lib/effects";
import { research } from "@/content/chapters";
import type { ChapterDef } from "@/lib/scroll-map";
import type { SplitText } from "@/lib/effects/plugins";
import { MilestonePath } from "@/components/illustrations";
import HeadlineText from "./HeadlineText";
import { assertNormalized, type ChapterHandle } from "./chapter-handle";

export default function Research({
  chapter,
  ref,
}: {
  chapter: ChapterDef;
  ref?: React.Ref<ChapterHandle>;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  useImperativeHandle(ref, () => ({
    connect(timeline) {
      const pin = timeline?.scrollTrigger;
      const stage = stageRef.current;
      const flow = flowRef.current;
      const headline = headlineRef.current;
      if (!timeline || !pin || !stage || !flow || !headline) return;

      const splits: SplitText[] = [];

      // Local-progress anchor (time == local progress) for the PINNED stage timeline.
      timeline.to({ _p: 0 }, { _p: 1, duration: 1, ease: "none" }, 0);

      // Rule A — headline blur-in on entering (one-shot).
      splits.push(
        blurIn(headline, {
          scrollTrigger: { trigger: pin.trigger as Element, start: "top 80%", once: true },
        }).split,
      );

      // Rule C — institutions row rises, scrubbed across local 0.2–0.7.
      const institutions = stage.querySelectorAll<HTMLElement>("[data-institution]");
      rise(institutions, { timeline, position: 0.2, end: 0.7 });

      // ⑥ winding milestone path: draws once in the stage's right gutter on enter.
      const illo = stage.querySelector<SVGElement>("[data-research-illo]");
      if (illo) drawIn(illo, { scrollTrigger: { trigger: stage, start: "top 60%", once: true } });

      // Rule C — flow index rows: each rises ONCE as it enters (real-time one-shot,
      // NOT on the pinned timeline). These triggers are created inside ScrollStory's
      // desktop matchMedia context (connect runs there), so they tear down with it.
      const rows = flow.querySelectorAll<HTMLElement>("[data-project-row]");
      rows.forEach((row) => {
        rise(row, { scrollTrigger: { trigger: row, start: "top 85%", once: true } });
      });

      // Only the pinned timeline must normalise to 1 (the flow rows are off-timeline).
      assertNormalized(timeline, "Research");
      return () => splits.forEach((s) => s.revert());
    },
  }));

  return (
    <>
      {/* PINNED STAGE — ScrollStory pins this element (100vh) for the 120vh portion. */}
      <div
        ref={stageRef}
        data-pin-stage
        className="relative flex min-h-screen w-full flex-col justify-center px-8 py-16 text-[color:var(--fg)] motion-safe:md:h-screen motion-safe:md:min-h-0 motion-safe:md:overflow-hidden"
      >
        {/* ⑥ winding milestone path — right-gutter margin illustration (xl+ so it stays
            in the gutter without shifting the footprint). Verified headlessly at
            1280/1440 not to overlap the centered 1100px column's text. */}
        <MilestonePath
          data-research-illo
          className="pointer-events-none absolute right-[2vw] top-[16%] hidden h-24 w-24 text-[color:var(--fg)] opacity-50 xl:block"
        />
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8">
          <header className="flex flex-col gap-3">
            <span className="label text-xs text-[color:var(--terracotta)]">
              {chapter.actLabel}
            </span>
            <h2
              ref={headlineRef}
              className="font-[family-name:var(--font-display)] font-medium leading-[0.95] tracking-[-0.03em] text-[color:var(--fg)] text-[clamp(2.5rem,7vw,5.5rem)]"
            >
              <HeadlineText headline={research.headline} />
            </h2>
            {research.sub ? (
              <p className="max-w-2xl font-[family-name:var(--font-serif)] text-lg text-[color:var(--fg)] opacity-90">
                {research.sub}
              </p>
            ) : null}
          </header>

          {/* Institutions row — 4 cards (§5). */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {research.institutions.map((card) => (
              <article
                key={card.title}
                data-institution
                className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-[color:var(--hairline)] bg-[color:var(--paper-deep)] p-5 text-[color:var(--ink)]"
              >
                {card.eyebrow ? (
                  <span className="label text-[0.6rem] text-[color:var(--terracotta)]">
                    {card.eyebrow}
                  </span>
                ) : null}
                <h3 className="font-[family-name:var(--font-display)] text-lg font-medium">
                  {card.title}
                </h3>
                {card.body ? (
                  <p className="text-xs opacity-80">{card.body}</p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* NATURAL-FLOW block — exactly 100vh; the index rows scroll normally here. */}
      <div
        ref={flowRef}
        data-research-flow
        className="relative flex w-full flex-col justify-center px-8 py-16 text-[color:var(--fg)] motion-safe:md:h-screen"
      >
        <ul className="mx-auto flex w-full max-w-[1100px] flex-col">
          {research.index.map((row, i) => {
            const number = String(i + 1).padStart(2, "0");
            // Rows carry a live-region seam for Task 4's constellation hover (moon +
            // point brighten on hover); here hover is CSS-only (border warms to
            // terracotta 60%, y −4px). `data-project-row={i}` is that Task-4 seam.
            const rowClass =
              "group flex items-baseline gap-4 border-t border-[color:var(--hairline)] py-5 transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:[border-color:color-mix(in_srgb,var(--terracotta)_60%,transparent)]";
            const body = (
              <>
                <span className="label shrink-0 text-xs text-[color:var(--fg)] opacity-40">
                  {row.href ? "→" : number}
                </span>
                <span className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
                  <span
                    className={`font-[family-name:var(--font-display)] text-xl font-medium ${
                      row.href ? "text-[color:var(--terracotta-hot)]" : "text-[color:var(--fg)]"
                    }`}
                  >
                    {row.title}
                  </span>
                  {row.description ? (
                    <span className="flex-1 text-sm text-[color:var(--fg)] opacity-70">
                      {row.description}
                    </span>
                  ) : null}
                </span>
              </>
            );
            return (
              <li key={row.title}>
                {row.href ? (
                  <a
                    href={row.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-project-row={i}
                    className={rowClass}
                  >
                    {body}
                  </a>
                ) : (
                  <div data-project-row={i} className={rowClass}>
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

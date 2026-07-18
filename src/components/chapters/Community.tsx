"use client";

/**
 * Chapter 4 — Community (spec §6 ch4). One pinned 100vh stage; ScrollStory owns the
 * shell, pin, and the ink→cream act crossfade that runs over this chapter's opening
 * (§6: local 0–0.45, INK_TO_CREAM 760–860vh). Effects are built in `connect`
 * (see chapter-handle.ts).
 *
 * Beats (local progress 0..1 == timeline time):
 *  - headline (h2): Rule A blur-in on entering (one-shot, ~0.05).
 *  - sub: static serif — it is short, so per the brief it stays static (no Rule B),
 *    keeping the effect budget low; there is no body paragraph on this chapter.
 *  - three cards: Rule C rise, scrubbed [0.15, 0.6]; copy is static once risen
 *    (scannable — no scrub inside cards). RTP Pathway + Durham AI Literacy Workshop
 *    are terracotta feature cards (cream headline `--paper`, ink body `--ink` per §4
 *    contrast rules); Zhu Academy is a compact terracotta card.
 *  - kraft chips (presidencies, boards): Rule C rise last, scrubbed [0.6, 0.85], with
 *    a Rule D scramble on each chip label (one-shot via `pulseAt` at 0.62 as they rise).
 *
 * Every colour is token-driven (--terracotta / --paper / --ink / --kraft), so the
 * cards ride the crossfade vars correctly through the dark→cream transition.
 */

import { useImperativeHandle, useRef } from "react";
import { blurIn, drawIn, rise, scramble } from "@/lib/effects";
import { wireHoverArrows } from "@/lib/interactions";
import { community } from "@/content/chapters";
import type { ChapterDef } from "@/lib/scroll-map";
import type { SplitText } from "@/lib/effects/plugins";
import { HandsLantern, HoverArrow, NodeBlossom } from "@/components/illustrations";
import HeadlineText from "./HeadlineText";
import { assertNormalized, pulseAt, type ChapterHandle } from "./chapter-handle";

// Chip groups in first-seen order ("President", "Boards"), so the two rows render in
// the §5 order regardless of how the flat chip list is authored.
const CHIP_GROUPS = Array.from(
  community.chips.reduce((map, chip) => {
    const group = chip.group ?? "";
    map.set(group, [...(map.get(group) ?? []), chip.label]);
    return map;
  }, new Map<string, string[]>()),
);

export default function Community({
  chapter,
  ref,
}: {
  chapter: ChapterDef;
  ref?: React.Ref<ChapterHandle>;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  useImperativeHandle(ref, () => ({
    connect(timeline) {
      const pin = timeline?.scrollTrigger;
      const root = rootRef.current;
      const headline = headlineRef.current;
      if (!timeline || !pin || !root || !headline) return;

      const splits: SplitText[] = [];

      // Local-progress anchor (time == local progress).
      timeline.to({ _p: 0 }, { _p: 1, duration: 1, ease: "none" }, 0);

      // Rule A — headline blur-in on entering (one-shot), then it stays pinned.
      splits.push(
        blurIn(headline, {
          scrollTrigger: { trigger: pin.trigger as Element, start: "top 80%", once: true },
        }).split,
      );

      // Rule C — the three cards rise, scrubbed across local 0.15–0.6.
      const cards = root.querySelectorAll<HTMLElement>("[data-community-card]");
      rise(cards, { timeline, position: 0.15, end: 0.6 });

      // Rule C — kraft chips rise last, scrubbed across local 0.6–0.85 …
      const chips = root.querySelectorAll<HTMLElement>("[data-chip]");
      rise(chips, { timeline, position: 0.6, end: 0.85 });

      // … and a Rule D scramble plays over each chip label as they rise (one-shot).
      pulseAt(pin, 0.62, () => {
        chips.forEach((chip, i) => scramble(chip, { delay: i * 0.04 }));
      });

      // Cream line-work on the terracotta cards (⑤ RTP, ① Durham): draws once as the
      // stage enters.
      root.querySelectorAll<SVGElement>("[data-illustration-slot] svg").forEach((svg) => {
        drawIn(svg, {
          scrollTrigger: { trigger: pin.trigger as Element, start: "top 55%", once: true },
        });
      });

      // Hover arrow (§8): draws in on hover of the two big cards, reverses on leave.
      const unwireArrows = wireHoverArrows(root, "[data-community-card]");

      assertNormalized(timeline, "Community");
      return () => {
        splits.forEach((s) => s.revert());
        unwireArrows();
      };
    },
  }));

  return (
    <div
      ref={rootRef}
      className="relative flex min-h-screen w-full flex-col justify-center px-8 py-16 text-[color:var(--fg)] motion-safe:md:h-screen motion-safe:md:min-h-0 motion-safe:md:overflow-hidden"
    >
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8">
        <header className="flex flex-col gap-3">
          <span className="label text-xs text-[color:var(--terracotta)]">{chapter.actLabel}</span>
          <h2
            ref={headlineRef}
            className="font-[family-name:var(--font-display)] font-medium leading-[0.95] tracking-[-0.03em] text-[color:var(--fg)] text-[clamp(2.5rem,7vw,5.5rem)]"
          >
            <HeadlineText headline={community.headline} />
          </h2>
          {community.sub ? (
            <p className="max-w-2xl font-[family-name:var(--font-serif)] text-lg text-[color:var(--fg)] opacity-90">
              {community.sub}
            </p>
          ) : null}
        </header>

        {/* RTP Pathway + Durham (terracotta feature cards) + Zhu Academy (compact). */}
        <div className="grid gap-4 md:grid-cols-2">
          {community.cards.map((card, i) => {
            const compact = card.compact === true;
            return (
              <article
                key={card.title}
                data-community-card
                className={`relative flex flex-col gap-2 overflow-hidden rounded-[var(--radius-card)] bg-[color:var(--terracotta)] ${
                  compact ? "p-5 md:col-span-2" : "p-6"
                }`}
              >
                {/* Cream line-work: ⑤ two hands passing a node-lantern on RTP (card 0),
                    ① node-blossom on Durham (card 1). Absolute corner, zero flow
                    footprint; accent forced to currentColor so the one accent path
                    stays cream on the terracotta surface (§4). */}
                <div
                  aria-hidden="true"
                  data-illustration-slot
                  className="pointer-events-none absolute inset-0"
                >
                  {i === 0 ? (
                    <HandsLantern
                      accent="currentColor"
                      className="absolute bottom-3 right-3 h-20 w-20 text-[color:var(--paper)] opacity-40"
                    />
                  ) : i === 1 ? (
                    <NodeBlossom
                      accent="currentColor"
                      className="absolute bottom-3 right-3 h-20 w-20 text-[color:var(--paper)] opacity-40"
                    />
                  ) : null}
                </div>
                {/* Hover arrow (§8) on the two big cards — cream, top-right, no shift.
                    opacity-0 by default; only desktop hover draws it in. */}
                {!compact ? (
                  <HoverArrow className="pointer-events-none absolute right-4 top-4 h-4 w-5 text-[color:var(--paper)] opacity-0" />
                ) : null}
                <h3 className="font-[family-name:var(--font-display)] text-xl font-medium text-[color:var(--paper)]">
                  {card.title}
                </h3>
                {card.body ? (
                  <p className="text-sm text-[color:var(--ink)]">{card.body}</p>
                ) : null}
              </article>
            );
          })}
        </div>

        {/* Kraft chips: two rows (presidencies, boards). */}
        <div className="flex flex-col gap-3">
          {CHIP_GROUPS.map(([group, labels]) => (
            <div key={group} className="flex flex-wrap items-center gap-2">
              <span className="label text-[0.65rem] text-[color:var(--fg)] opacity-50">
                {group}
              </span>
              {labels.map((label) => (
                <span
                  key={label}
                  data-chip
                  className="label rounded-[var(--radius-chip)] bg-[color:var(--kraft)] px-2.5 py-1 text-[0.65rem] text-[color:var(--ink)]"
                >
                  {label}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

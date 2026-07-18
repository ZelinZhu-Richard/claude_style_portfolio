"use client";

/**
 * Chapter 2 — About (spec §6 ch2). Inner 100vh stage; ScrollStory owns the shell
 * and pin. Effects built in `connect` (see chapter-handle.ts).
 *
 * Beats (local progress 0..1 == timeline time):
 *  - headline (h2): Rule A blur-in on entering (one-shot).
 *  - body: Rule B word-scrub local 0–0.5.
 *  - stat grid: Rule C rise (stagger `stagger.cards`) local 0.45–0.8; numerals
 *    count up once (own non-scrub trigger, 1.2s power1.out, snapped); labels Rule D.
 *  - Education + Anthropic Academy cards: Rule C rise local 0.6–0.85.
 *  - everything fades opacity→0, y:−20 local 0.9–1.0 into the dark crossfade.
 *  - scrollState.noiseAmp eases 0.15→0.04 across the whole chapter (§6: "the field
 *    holds its breath") — one scrubbed tween Task 4's constellation reads.
 */

import { useImperativeHandle, useRef } from "react";
import { gsap } from "gsap";
import { blurIn, rise, scramble, wordScrub } from "@/lib/effects";
import { stagger } from "@/lib/motion/tokens";
import { scrollState } from "@/lib/scroll-state";
import { about } from "@/content/chapters";
import type { SplitText } from "@/lib/effects/plugins";
import HeadlineText from "./HeadlineText";
import { assertNormalized, pulseAt, type ChapterHandle } from "./chapter-handle";

/**
 * Count a numeral up from zero to its final displayed value, preserving any
 * non-numeric prefix/suffix (e.g. "60+", "top ~5%", "4.00"). Non-numeric values
 * are left as-is. Fired once, in real time (1.2s power1.out, snapped) — not scrubbed.
 */
function countUp(el: HTMLElement, opts: { delay?: number } = {}): void {
  const final = el.dataset.final ?? el.textContent ?? "";
  const match = final.match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
  if (!match) {
    el.textContent = final;
    return;
  }
  const [, prefix, numStr, suffix] = match;
  const target = parseFloat(numStr);
  const decimals = numStr.includes(".") ? numStr.split(".")[1].length : 0;
  const snapUnit = decimals === 0 ? 1 : Math.pow(10, -decimals);
  const proxy = { v: 0 };
  gsap.to(proxy, {
    v: target,
    duration: 1.2,
    ease: "power1.out",
    delay: opts.delay,
    snap: { v: snapUnit }, // §6: snap:1 (integers); decimals snap to their unit
    onUpdate: () => {
      el.textContent = `${prefix}${proxy.v.toFixed(decimals)}${suffix}`;
    },
  });
}

export default function About({ ref }: { ref?: React.Ref<ChapterHandle> }) {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    connect(timeline) {
      const pin = timeline.scrollTrigger;
      const content = contentRef.current;
      const headline = headlineRef.current;
      const body = bodyRef.current;
      if (!pin || !content || !headline || !body) return;

      const splits: SplitText[] = [];

      // Local-progress anchor (time == local progress).
      timeline.to({ _p: 0 }, { _p: 1, duration: 1, ease: "none" }, 0);

      // §6 ch2: nebula "holds its breath" — noiseAmp 0.15→0.04 across the chapter.
      // Relocated here from ScrollStory.drive() so it lives on the chapter timeline.
      timeline.to(scrollState, { noiseAmp: 0.04, ease: "none", duration: 1 }, 0);

      // Rule A — headline blur-in on entering (one-shot).
      splits.push(
        blurIn(headline, {
          scrollTrigger: { trigger: pin.trigger as Element, start: "top 80%", once: true },
        }).split,
      );

      // Rule B — body word-scrub, local 0–0.5.
      splits.push(wordScrub(timeline, body, { start: 0, end: 0.5 }));

      // Rule C — stat tiles rise, scrubbed across local 0.45–0.8 (fits the window).
      const tiles = content.querySelectorAll<HTMLElement>("[data-stat]");
      rise(tiles, { timeline, position: 0.45, end: 0.8 });

      // Rule C — Education + Anthropic Academy cards rise, local 0.6–0.85.
      const cards = content.querySelectorAll<HTMLElement>("[data-about-card]");
      rise(cards, { timeline, position: 0.6, end: 0.85 });

      // Numerals count up ONCE + labels Rule D scramble, fired by a non-scrub point
      // trigger when the grid first reveals (local 0.45).
      const numerals = content.querySelectorAll<HTMLElement>("[data-stat-value]");
      const labels = content.querySelectorAll<HTMLElement>("[data-stat-label]");
      let counted = false;
      pulseAt(pin, 0.45, () => {
        if (counted) return;
        counted = true;
        numerals.forEach((el, i) => countUp(el, { delay: i * stagger.cards }));
        labels.forEach((el, i) => scramble(el, { delay: i * stagger.cards }));
      });

      // Everything fades out into the dark crossfade, local 0.9–1.0.
      timeline.to(content, { opacity: 0, y: -20, ease: "none", duration: 0.1 }, 0.9);

      assertNormalized(timeline, "About");
      return () => splits.forEach((s) => s.revert());
    },
  }));

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center px-8 py-16 motion-safe:md:h-screen motion-safe:md:min-h-0 motion-safe:md:overflow-hidden">
      <div ref={contentRef} className="mx-auto flex w-full max-w-[1100px] flex-col gap-8">
        <div className="flex flex-col gap-4">
          <h2
            ref={headlineRef}
            className="font-[family-name:var(--font-display)] font-medium leading-[0.95] tracking-[-0.03em] text-[color:var(--fg)] text-[clamp(2.5rem,7vw,5.5rem)]"
          >
            <HeadlineText headline={about.headline} />
          </h2>
          {about.body ? (
            <p ref={bodyRef} className="max-w-3xl text-lg text-[color:var(--fg)]">
              {about.body}
            </p>
          ) : null}
        </div>

        {/* Stat grid — 6 tiles (§5). Counters use tabular-nums (§4). */}
        <ul className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
          {about.stats.map((stat) => (
            <li
              key={stat.label}
              data-stat
              className="flex flex-col gap-1 border-t border-[color:var(--hairline)] pt-3"
            >
              <span
                data-stat-value
                data-final={stat.value}
                className="font-[family-name:var(--font-display)] font-medium tabular-nums leading-none text-[color:var(--fg)] text-[clamp(1.75rem,4vw,3rem)]"
              >
                {stat.value}
              </span>
              <span
                data-stat-label
                className="label text-[0.65rem] text-[color:var(--fg)] opacity-60"
              >
                {stat.label}
              </span>
            </li>
          ))}
        </ul>

        {/* Education (paper) + Anthropic Academy (terracotta) cards. */}
        <div className="grid gap-4 sm:grid-cols-2">
          {about.cards.map((card) => {
            const terracotta = card.variant === "terracotta";
            return (
              <div
                key={card.title}
                data-about-card
                className={`flex flex-col gap-2 rounded-[var(--radius-card)] border p-5 ${
                  terracotta
                    ? "border-transparent bg-[color:var(--terracotta)] text-[color:var(--paper)]"
                    : "border-[color:var(--hairline)] bg-[color:var(--paper-deep)] text-[color:var(--ink)]"
                }`}
              >
                <h3
                  className={`font-[family-name:var(--font-display)] text-xl font-medium ${
                    terracotta ? "text-[color:var(--paper)]" : "text-[color:var(--ink)]"
                  }`}
                >
                  {card.title}
                </h3>
                {card.body ? <p className="text-sm">{card.body}</p> : null}
                {card.items ? (
                  <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs opacity-90">
                    {card.items.map((item) => (
                      <li key={item} className="whitespace-nowrap">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

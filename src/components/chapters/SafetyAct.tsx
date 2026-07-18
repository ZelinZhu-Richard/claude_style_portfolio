"use client";

/**
 * Chapter 3 — Safety, the dark act (spec §6 ch3). One pinned 100vh stage; a
 * left text column whose three beats swap in place, a right column reserving the
 * shielded-lattice constellation's negative space (Task 4), and a mono audit-log
 * margin that ticks in as the act progresses. ScrollStory owns the shell, pin, and
 * the cream→ink crossfade; effects are built in `connect` (see chapter-handle.ts).
 *
 * Beats (local progress 0..1 == timeline time):
 *  - headline "Show your work." (h2): Rule A blur-in on entering (0–0.1), stays.
 *  - Beat 1 Scutum (0.08–0.40): sub + body Rule B; risk chips Rule D at
 *    0.18/0.22/0.26; at 0.28 the mock tool-call gets a terracotta strikethrough
 *    (scaleX 0→1, 0.4s) + a BLOCKED chip.
 *  - Beat 2 Quantlab (0.40–0.72): column crossfade (beat 1 out y:−24; beat 2 in
 *    Rule C). [Task 5: kill-criteria DrawSVG slot.]
 *  - Beat 3 thesis (0.72–1.0): Al9ha compact card + closing line Rule B.
 *    [Task 5: shield DrawSVG slot.]
 *  - audit-log lines fade opacity 0→0.55 (scrubbed) at fixed local progresses.
 */

import { useImperativeHandle, useRef } from "react";
import { gsap } from "gsap";
import { blurIn, drawIn, rise, scramble, wordScrub } from "@/lib/effects";
import { ease } from "@/lib/motion/tokens";
import { safety, type ProjectCard } from "@/content/chapters";
import type { ChapterDef } from "@/lib/scroll-map";
import type { SplitText } from "@/lib/effects/plugins";
import { HatchedShield, HandCradle, KillCriteriaDiagram } from "@/components/illustrations";
import HeadlineText from "./HeadlineText";
import { assertNormalized, pulseAt, type ChapterHandle } from "./chapter-handle";

// Component-local mono decorations (not narrative copy — the brief permits these as
// local constants). The risk levels, the mock tool-call, and the audit-log motif.
const RISK_CHIPS = ["LOW", "MED", "HIGH"] as const;
const TOOL_CALL_LINE = "tool_call: shell.exec — risk: HIGH";
const BLOCKED_LABEL = "BLOCKED";
const AUDIT_LOG: ReadonlyArray<{ text: string; ok?: boolean; at: number }> = [
  { text: "session risk-scored: LOW", ok: true, at: 0.14 },
  { text: "tool_call: fs.read — risk: LOW — allowed", at: 0.3 },
  { text: "tool_call: shell.exec — risk: HIGH — BLOCKED", at: 0.48 },
  { text: "review: approved by human", ok: true, at: 0.66 },
  { text: "replay: incident-014 — sealed", ok: true, at: 0.86 },
];

/** A dark-act (slate-raised) card. Scutum carries a live link. */
function SlateCard({ card }: { card: ProjectCard }) {
  return (
    <div
      data-beat-card
      className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[color:var(--hairline)] bg-[color:var(--slate-raised)] p-6 text-[color:var(--cream-ghost)]"
    >
      <h3 className="font-[family-name:var(--font-display)] text-2xl font-medium">
        {card.href ? (
          <a
            href={card.href}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-[color:var(--terracotta-hot)] decoration-1 underline-offset-4"
          >
            {card.title}
          </a>
        ) : (
          card.title
        )}
      </h3>
      {card.body ? <p className="text-sm opacity-90">{card.body}</p> : null}
    </div>
  );
}

export default function SafetyAct({
  chapter,
  ref,
}: {
  chapter: ChapterDef;
  ref?: React.Ref<ChapterHandle>;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const closingRef = useRef<HTMLParagraphElement>(null);

  const index = `${String(chapter.index).padStart(2, "0")} / ${chapter.label.toUpperCase()}`;
  const [scutum, quantlab, al9ha] = safety.cards;

  useImperativeHandle(ref, () => ({
    connect(timeline) {
      const pin = timeline?.scrollTrigger;
      const root = rootRef.current;
      const headline = headlineRef.current;
      const sub = subRef.current;
      const body = bodyRef.current;
      const closing = closingRef.current;
      if (!timeline || !pin || !root || !headline || !sub || !body || !closing) return;

      const splits: SplitText[] = [];

      // Local-progress anchor (time == local progress).
      timeline.to({ _p: 0 }, { _p: 1, duration: 1, ease: "none" }, 0);

      // Rule A — headline blur-in on entering (local 0–0.1), then stays pinned.
      splits.push(
        blurIn(headline, {
          scrollTrigger: { trigger: pin.trigger as Element, start: "top 80%", once: true },
        }).split,
      );

      // ---- Beat 1 — Scutum (0.08–0.40) ----
      splits.push(wordScrub(timeline, sub, { start: 0.08, end: 0.2 }));
      splits.push(wordScrub(timeline, body, { start: 0.14, end: 0.34 }));
      const scutumCard = root.querySelector<HTMLElement>('[data-beat="1"] [data-beat-card]');
      if (scutumCard) rise(scutumCard, { timeline, position: 0.12, end: 0.3 });

      // Risk chips Rule D at 0.18 / 0.22 / 0.26.
      const chips = root.querySelectorAll<HTMLElement>("[data-risk-chip]");
      gsap.set(chips, { opacity: 0 });
      const chipAt = [0.18, 0.22, 0.26];
      chips.forEach((chip, i) => {
        pulseAt(
          pin,
          chipAt[i] ?? 0.26,
          () => {
            gsap.set(chip, { opacity: 1 });
            scramble(chip);
          },
          () => gsap.set(chip, { opacity: 0 }),
        );
      });

      // At 0.28 — terracotta strikethrough over the tool-call + BLOCKED chip.
      const strike = root.querySelector<HTMLElement>("[data-strike]");
      const blocked = root.querySelector<HTMLElement>("[data-blocked]");
      if (strike) gsap.set(strike, { scaleX: 0, transformOrigin: "left center" });
      if (blocked) gsap.set(blocked, { opacity: 0 });
      pulseAt(
        pin,
        0.28,
        () => {
          if (strike) gsap.to(strike, { scaleX: 1, duration: 0.4, ease: ease.reveal });
          if (blocked) {
            gsap.set(blocked, { opacity: 1 });
            scramble(blocked);
          }
        },
        () => {
          if (strike) gsap.set(strike, { scaleX: 0 });
          if (blocked) gsap.set(blocked, { opacity: 0 });
        },
      );

      // ---- Beat 2 — Quantlab (0.40–0.72): crossfade ----
      const beat1 = root.querySelector<HTMLElement>('[data-beat="1"]');
      const beat2 = root.querySelector<HTMLElement>('[data-beat="2"]');
      const beat3 = root.querySelector<HTMLElement>('[data-beat="3"]');
      if (beat1) timeline.to(beat1, { y: -24, opacity: 0, ease: "none", duration: 0.04 }, 0.4);
      if (beat2) rise(beat2, { timeline, position: 0.42, end: 0.52 });

      // Kill-criteria flow diagram: boxes + arrows scrub-draw 0.44–0.60, mono labels
      // fade in just after (0.56–0.62) — the §6 beat-2 0.44–0.62 window.
      const diagram = root.querySelector<SVGElement>("[data-killcriteria-slot] svg");
      if (diagram) {
        drawIn(diagram, { timeline, position: 0.44, end: 0.6 });
        const labels = diagram.querySelectorAll<SVGElement>("[data-diagram-label]");
        timeline.set(labels, { opacity: 0 }, 0);
        timeline.to(labels, { opacity: 1, ease: "none", duration: 0.015, stagger: 0.015 }, 0.56);
      }

      // ---- Beat 3 — thesis (0.72–1.0) ----
      if (beat2) timeline.to(beat2, { y: -24, opacity: 0, ease: "none", duration: 0.04 }, 0.72);
      if (beat3) rise(beat3, { timeline, position: 0.74, end: 0.84 });
      splits.push(wordScrub(timeline, closing, { start: 0.8, end: 0.98 }));

      // ③ hatched shield wraps the constellation's negative space, scrub 0.74–0.9.
      const shield = root.querySelector<SVGElement>("[data-shield-illo]");
      if (shield) drawIn(shield, { timeline, position: 0.74, end: 0.9 });

      // ④ hand cradling a node-star + olive check — the dark-act close, scrub 0.8–0.95.
      const cradle = root.querySelector<SVGElement>("[data-cradle-illo]");
      if (cradle) drawIn(cradle, { timeline, position: 0.8, end: 0.95 });

      // ---- Audit-log margin: tick lines in (opacity 0→0.55) at fixed progresses ----
      root.querySelectorAll<HTMLElement>("[data-log]").forEach((line) => {
        const at = Number(line.dataset.log);
        timeline.set(line, { opacity: 0 }, 0);
        timeline.to(line, { opacity: 0.55, ease: "none", duration: 0.03 }, at);
      });

      assertNormalized(timeline, "Safety");
      return () => splits.forEach((s) => s.revert());
    },
  }));

  return (
    <div
      ref={rootRef}
      className="relative flex min-h-screen w-full flex-col px-8 py-16 text-[color:var(--fg)] motion-safe:md:h-screen motion-safe:md:min-h-0 motion-safe:md:overflow-hidden"
    >
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <span className="label text-xs text-[color:var(--terracotta)]">{chapter.actLabel}</span>
          <span className="label text-xs text-[color:var(--fg)] opacity-50">{index}</span>
        </div>
        <h2
          ref={headlineRef}
          className="font-[family-name:var(--font-display)] font-medium leading-[0.95] tracking-[-0.03em] text-[color:var(--fg)] text-[clamp(2.5rem,8vw,6rem)]"
        >
          <HeadlineText headline={safety.headline} />
        </h2>
      </header>

      <div className="mt-8 grid flex-1 gap-8 md:grid-cols-2">
        {/* LEFT — three swapping beats. On desktop they stack (absolute) and swap;
            under reduced-motion / mobile they flow, all readable. */}
        <div className="relative">
          {/* Beat 1 — Scutum */}
          <div
            data-beat="1"
            className="flex flex-col gap-5 motion-safe:md:absolute motion-safe:md:inset-0"
          >
            <p ref={subRef} className="text-xl text-[color:var(--fg)]">
              {safety.sub}
            </p>
            <p ref={bodyRef} className="max-w-xl text-sm text-[color:var(--fg)] opacity-90">
              {safety.body}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {RISK_CHIPS.map((risk) => (
                <span
                  key={risk}
                  data-risk-chip
                  className="label rounded-[var(--radius-chip)] border border-[color:var(--hairline)] px-2.5 py-1 text-[0.65rem] text-[color:var(--fg)] motion-safe:md:opacity-0"
                >
                  {risk}
                </span>
              ))}
            </div>
            {/* Mock tool-call with terracotta strikethrough + BLOCKED chip. */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="relative inline-block">
                <code className="label text-[0.7rem] text-[color:var(--fg)] opacity-80">
                  {TOOL_CALL_LINE}
                </code>
                <span
                  data-strike
                  aria-hidden="true"
                  className="absolute left-0 top-1/2 h-px w-full origin-left bg-[color:var(--terracotta)] motion-safe:md:scale-x-0"
                />
              </span>
              <span
                data-blocked
                className="label rounded-[var(--radius-chip)] bg-[color:var(--terracotta)] px-2.5 py-1 text-[0.65rem] text-[color:var(--paper)] motion-safe:md:opacity-0"
              >
                {BLOCKED_LABEL}
              </span>
            </div>
            <SlateCard card={scutum} />
          </div>

          {/* Beat 2 — Quantlab */}
          <div
            data-beat="2"
            className="flex flex-col gap-5 motion-safe:md:absolute motion-safe:md:inset-0 motion-safe:md:opacity-0"
          >
            <SlateCard card={quantlab} />
            {/* Kill-criteria / referee flow diagram (scrub 0.44–0.62). The h-24 slot
                already reserves the layout space, so mounting the SVG shifts nothing. */}
            <div aria-hidden="true" data-killcriteria-slot className="h-24 w-full">
              <KillCriteriaDiagram className="h-full w-full text-[color:var(--fg)]" />
            </div>
          </div>

          {/* Beat 3 — thesis */}
          <div
            data-beat="3"
            className="flex flex-col gap-6 motion-safe:md:absolute motion-safe:md:inset-0 motion-safe:md:opacity-0"
          >
            <SlateCard card={al9ha} />
            <p
              ref={closingRef}
              className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,4vw,3rem)] font-medium leading-tight text-[color:var(--fg)]"
            >
              <HeadlineText headline={safety.closingLine} />
            </p>
            {/* ④ hand cradling a node-star + olive check — sits in the beat's lower
                margin, drawn on the closing scrub (absolute → no layout shift). */}
            <HandCradle
              data-cradle-illo
              className="pointer-events-none absolute bottom-0 right-1 hidden h-24 w-24 text-[color:var(--fg)] opacity-80 md:block"
            />
          </div>
        </div>

        {/* RIGHT — constellation negative space + audit-log margin. */}
        <div className="relative hidden md:block">
          {/* Task 4: the shielded-lattice constellation renders in the fixed canvas
              BEHIND the DOM; this column reserves its right-half negative space. */}
          <div aria-hidden="true" data-constellation-slot className="pointer-events-none absolute inset-0" />
          {/* ③ hatched shield outline framing the constellation space (scrub 0.74–0.9). */}
          <HatchedShield
            data-shield-illo
            className="pointer-events-none absolute left-1/2 top-1/2 h-[min(48vh,440px)] w-[min(48vh,440px)] -translate-x-1/2 -translate-y-1/2 text-[color:var(--fg)] opacity-20"
          />
          <ul className="absolute right-0 top-0 flex flex-col gap-2 text-right">
            {AUDIT_LOG.map((line) => (
              <li
                key={line.text}
                data-log={line.at}
                className="label text-[0.6rem] leading-relaxed text-[color:var(--fg)] opacity-[0.55]"
              >
                {line.text}
                {line.ok ? (
                  <span aria-hidden="true" className="text-[color:var(--olive)]">
                    {" "}
                    ✓
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

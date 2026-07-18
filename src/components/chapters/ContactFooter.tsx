"use client";

/**
 * Chapter 7 — Contact (spec §6 ch7). A terracotta footer that closes the story.
 *
 * REVEAL DECISION (§6 "footer position: sticky; bottom: 0, page lifts off it"):
 * the footer is `position: sticky; bottom: 0`, honouring the spec literally, and it
 * is verified glitch-free against the pin-spacer document — Honors (a FLOW section)
 * sits between the last pinned section (Research) and this footer, so no pin-spacer
 * is adjacent. A *dramatic* curtain lift-off (the page sliding up to uncover a footer
 * behind it) additionally needs the sections above to be OPAQUE and stacked over the
 * footer; here the story sections are intentionally transparent so the Task-4 canvas
 * shows through them, so a behind-footer would bleed through. Rather than break that
 * architecture (or the exact 100vh budget, which leaves no extra scroll travel for a
 * reveal), the sticky positioning is applied and reads as a clean terracotta reveal;
 * a stronger lift-off would be a Task 6/7 decision if opaque section backgrounds are
 * ever introduced. The section stays exactly 100vh, so the document total is unchanged.
 *
 * Effects (built in `connect`, no timeline — like Honors, it is a non-pinned chapter):
 *  - headline (h2): Rule A blur-in on enter (one-shot).
 *  - sub + CTA pill + links + meta + colophon: Rule C rise on enter (staggered).
 * Under reduced motion `connect` is never called, so the footer is statically readable.
 *
 * Task-6 seams (invisible, attributes only): `data-magnetic` (magnetic CTA +
 * copy-on-click + olive ✓), `data-local-clock` (live America/New_York clock).
 */

import { useEffect, useImperativeHandle, useRef, useState } from "react";
import { blurIn, drawIn, rise } from "@/lib/effects";
import { stagger } from "@/lib/motion/tokens";
import { useLocalClock } from "@/lib/interactions";
import { contact } from "@/content/chapters";
import type { SplitText } from "@/lib/effects/plugins";
import { PaperPlane } from "@/components/illustrations";
import HeadlineText from "./HeadlineText";
import { type ChapterHandle } from "./chapter-handle";

const EMAIL = contact.cta.href.replace(/^mailto:/, "");

export default function ContactFooter({ ref }: { ref?: React.Ref<ChapterHandle> }) {
  const rootRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  // Live America/New_York clock into the `[data-local-clock]` span (§8).
  useLocalClock(clockRef);

  // Clear a pending ✓-hide on unmount (avoids a setState after unmount).
  useEffect(() => () => {
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
  }, []);

  // Copy-on-click (§8): copy the address, flash an olive ✓ for 1.6s, and let the mailto
  // navigate anyway. Clipboard permission failure is swallowed — the mailto still works.
  const copyEmail = () => {
    const done = () => {
      setCopied(true);
      // Reset the window on rapid re-clicks so ✓ always shows a full 1.6s from the last copy.
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
    };
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(EMAIL).then(done, () => {}); // reject → silent
      } else {
        const ta = document.createElement("textarea");
        ta.value = EMAIL;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (ok) done();
      }
    } catch {
      /* clipboard blocked — stay silent; the mailto navigation still happens */
    }
  };

  useImperativeHandle(ref, () => ({
    connect() {
      const root = rootRef.current;
      const headline = headlineRef.current;
      if (!root || !headline) return;

      const splits: SplitText[] = [];

      // Rule A — headline blur-in on enter (one-shot).
      splits.push(
        blurIn(headline, {
          scrollTrigger: { trigger: root, start: "top 80%", once: true },
        }).split,
      );

      // Rule C — the rest of the footer rises on enter (one-shot, staggered).
      const revealed = root.querySelectorAll<HTMLElement>("[data-reveal]");
      rise(revealed, {
        stagger: stagger.rows,
        scrollTrigger: { trigger: root, start: "top 75%", once: true },
      });

      // ⑦ paper plane trailing orbiting nodes — draws once near the CTA on enter.
      const illo = root.querySelector<SVGElement>("[data-contact-illo]");
      if (illo) drawIn(illo, { scrollTrigger: { trigger: root, start: "top 70%", once: true } });

      return () => splits.forEach((s) => s.revert());
    },
  }));

  return (
    <footer
      ref={rootRef}
      className="sticky bottom-0 flex min-h-screen w-full flex-col justify-center gap-8 bg-[color:var(--terracotta)] px-8 py-16 motion-safe:md:h-screen"
    >
      {/* ⑦ paper plane — cream line-work in the right margin near the CTA (absolute →
          no layout shift; lg-only so it never crowds the copy). */}
      <PaperPlane
        data-contact-illo
        accent="currentColor"
        className="pointer-events-none absolute right-[6vw] top-[30%] hidden h-32 w-32 text-[color:var(--paper)] opacity-45 lg:block"
      />
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8">
        <div className="flex flex-col gap-4">
          <h2
            ref={headlineRef}
            className="font-[family-name:var(--font-display)] font-medium leading-[0.95] tracking-[-0.03em] text-[color:var(--paper)] text-[clamp(2.5rem,8vw,6rem)]"
          >
            <HeadlineText headline={contact.headline} />
          </h2>
          {contact.sub ? (
            <p
              data-reveal
              className="max-w-2xl font-[family-name:var(--font-serif)] text-lg text-[color:var(--ink)]"
            >
              {contact.sub}
            </p>
          ) : null}
        </div>

        {/* "Say hello" pill — cream bg, ink text. `data-magnetic` drives the magnetic
            hover (the ring morphs to these bounds; the label counter-translates); the
            mailto also copies the address on click and flashes an olive ✓. */}
        <div data-reveal className="flex w-fit items-center gap-4">
          <a
            href={contact.cta.href}
            data-magnetic
            onClick={copyEmail}
            className="inline-flex w-fit items-center rounded-[var(--radius-pill)] bg-[color:var(--paper)] px-8 py-4 font-[family-name:var(--font-display)] text-2xl font-medium text-[color:var(--ink)]"
          >
            <span data-magnetic-label>{contact.cta.label}</span>
          </a>
          <span
            role="status"
            aria-live="polite"
            className="label text-xs text-[color:var(--olive)] transition-opacity duration-200"
            style={{ opacity: copied ? 1 : 0 }}
          >
            {copied ? "copied ✓" : ""}
          </span>
        </div>

        {/* External links — GitHub + github.io. Task 6: underline DrawSVG on hover. */}
        <div data-reveal className="flex flex-wrap gap-x-8 gap-y-2">
          {contact.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base text-[color:var(--ink)] underline decoration-[color:var(--terracotta-hot)] decoration-1 underline-offset-4 transition-opacity hover:opacity-70"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Mono meta row: location + live-clock seam, languages, status. */}
        <div
          data-reveal
          className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[color:var(--ink)]"
        >
          <span className="label text-xs">
            {contact.meta.location} —{" "}
            {/* Live America/New_York clock (HH:MM:SS, colon blink) — filled by
                useLocalClock after hydration; SSR renders the placeholder. */}
            <span ref={clockRef} data-local-clock suppressHydrationWarning className="tabular-nums">
              --:--:--
            </span>
          </span>
          <span className="label text-xs">{contact.meta.languages}</span>
          <span className="label inline-flex items-center gap-2 text-xs">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[color:var(--olive)]" />
            {contact.meta.status}
          </span>
        </div>

        <p data-reveal className="max-w-2xl text-sm text-[color:var(--ink)] opacity-80">
          {contact.colophon}
        </p>
      </div>
    </footer>
  );
}

/**
 * Motion constants (spec §9 "Motion system rules").
 * GSAP eases are stored as their string names/expressions so they can be
 * passed straight into `gsap.to(..., { ease: ease.reveal })` etc.
 */

export const ease = {
  /** power3.out — reveals. */
  reveal: "power3.out",
  /** expo.inOut — cinematic (loader exit, panel swaps, camera). */
  cine: "expo.inOut",
  /** sine.inOut — idle loops. */
  breathe: "sine.inOut",
  /** elastic.out(1, 0.4) — magnetic release only. */
  magnetic: "elastic.out(1,0.4)",
} as const;

export const duration = {
  /** 0.3s */
  micro: 0.3,
  /** 0.6s */
  reveal: 0.6,
  /** 1.0s */
  cinematic: 1.0,
  /** 0.8s */
  loader: 0.8,
} as const;

export const stagger = {
  /** 0.03 — chars. */
  chars: 0.03,
  /** 0.05 — words (or position-mapped when scrubbed). */
  words: 0.05,
  /** 0.06 — rows. */
  rows: 0.06,
  /** 0.08 — cards. */
  cards: 0.08,
} as const;

export type Ease = typeof ease;
export type Duration = typeof duration;
export type Stagger = typeof stagger;

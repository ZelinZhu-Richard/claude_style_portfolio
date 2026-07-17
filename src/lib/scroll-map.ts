/**
 * scroll-map — the spec §6 "Master scroll map & choreography" table, encoded as
 * typed constants. This is the single source of truth for chapter order, scroll
 * budgets, pin behavior, scrub values, and target constellation formations that
 * both ScrollStory (pins) and later the canvas (Task 4) read from.
 *
 * All numeric values (vh budgets, scrub, crossfade windows, total) are verbatim
 * from §6. Where §6 and the Task-2 brief describe the same value differently, §6
 * wins (it is the binding spec); see the header comments on the crossfade windows
 * and the pin-`end` derivation in ScrollStory for the two places this matters.
 *
 * Pure, SSR-safe — no runtime/browser access.
 */

import { FORMATION, type Formation } from "./scroll-state";

/**
 * `pin` mirrors §6's "Pin" column:
 *  - `true`      — fully pinned chapter (Hero, About, Safety, Community)
 *  - `"partial"` — §6 "half": pins for part of its budget then flows (Research)
 *  - `"sticky"`  — §6 "sticky-reveal": a CSS `position: sticky` footer, not a
 *                  ScrollTrigger pin (Contact) — no pin is created in this task
 *  - `false`     — flows normally (Honors)
 */
export type PinMode = true | false | "partial" | "sticky";

export interface ChapterDef {
  /** kebab id; the section element is `#chapter-${id}`. */
  id: string;
  /** §6 "#" column — the human chapter number (Hero = 1 … Contact = 7). Loader is #0. */
  index: number;
  /** Display label for the big placeholder heading / general use. */
  label: string;
  /** Pill-nav label when it differs from `label` (Research shows "Work", §8). */
  navLabel?: string;
  /** Mono kicker above the heading, e.g. "ACT II — SAFETY" (§4/§8 chapter labels). */
  actLabel: string;
  /** Appears in the pill nav: About · Safety · Community · Work · Contact (§8). */
  navInNav: boolean;
  /** Desktop scroll budget in vh (§6 "Budget"/"Range"). */
  vh: number;
  /** For `pin: "partial"`, the pinned portion in vh (§6 Research: 120 pin + 100 flow). */
  pinVh?: number;
  /** §6 "Pin" column. */
  pin: PinMode;
  /** §6 "Scrub" column — smoothing for this chapter's scrubbed content timeline (Task 3). */
  scrub?: number;
  /** §6 "Formation" column — the constellation formation this chapter morphs TO. */
  formation: Formation;
}

/**
 * The 7 narrative chapters in scroll order (§6 rows 1–7). Row 0 (Loader) is timed,
 * not scrolled, and lands in Task 5 — it is not a section here.
 *
 * `index` uses §6's "#" numbering (Hero = 1 … Contact = 7) so `scrollState.chapter`
 * (which defaults to 0 = loader/pre-hero) reads as the human chapter number. To get
 * a chapter's data from `scrollState.chapter`, use `CHAPTERS[scrollState.chapter - 1]`.
 *
 * Act labels follow §2's three-act structure — Act I cream opening (Hero, About),
 * Act II dark (Safety, anchored by §5 "the approval gate from Act II"), Act III warm
 * return (Community → Contact). §6 tabulates budgets/pins/formations but not act
 * labels, so these are derived from that structure; Task 3 owns final copy.
 */
export const CHAPTERS: readonly ChapterDef[] = [
  {
    id: "hero",
    index: 1,
    label: "Hero",
    actLabel: "ACT I — HERO",
    navInNav: false,
    vh: 160,
    pin: true,
    scrub: 1,
    formation: FORMATION.NEBULA,
  },
  {
    id: "about",
    index: 2,
    label: "About",
    actLabel: "ACT I — ABOUT",
    navInNav: true,
    vh: 200,
    pin: true,
    scrub: 0.8,
    formation: FORMATION.NEBULA, // nebula condenses (noiseAmp 0.15 → 0.04), still nebula
  },
  {
    id: "safety",
    index: 3,
    label: "Safety",
    actLabel: "ACT II — SAFETY",
    navInNav: true,
    vh: 400,
    pin: true,
    scrub: 1.2,
    formation: FORMATION.LATTICE, // → shielded lattice
  },
  {
    id: "community",
    index: 4,
    label: "Community",
    actLabel: "ACT III — COMMUNITY",
    navInNav: true,
    vh: 220,
    pin: true,
    scrub: 1,
    formation: FORMATION.GRAPH, // → community graph
  },
  {
    id: "research",
    index: 5,
    label: "Research",
    navLabel: "Work",
    actLabel: "ACT III — RESEARCH",
    navInNav: true,
    vh: 220,
    pinVh: 120, // §6: 120 pin + 100 flow — true partial-pin split is a Task-3 refinement
    pin: "partial",
    scrub: 1,
    formation: FORMATION.MOONS, // → project moons
  },
  {
    id: "honors",
    index: 6,
    label: "Honors",
    actLabel: "ACT III — HONORS",
    navInNav: false,
    vh: 100,
    pin: false,
    formation: FORMATION.MOONS, // moons loosen +15%, still moons
  },
  {
    id: "contact",
    index: 7,
    label: "Contact",
    actLabel: "ACT III — CONTACT",
    navInNav: true,
    vh: 100,
    pin: "sticky", // §6 "sticky-reveal": CSS sticky footer (Task 3/7), not a ScrollTrigger pin
    formation: FORMATION.CALM, // → calm field
  },
] as const;

/** Total desktop scroll budget in vh (§6: 1400vh). The 7 chapter budgets sum to this. */
export const TOTAL_VH = 1400;

/**
 * Background act-crossfade windows, in vh of document scroll (§6):
 *  - cream → ink over 310–410vh (straddles About → Safety)
 *  - ink → cream over 760–860vh (Community's opening)
 * The bezel/HUD/constellation flip in lockstep at each window's midpoint.
 *
 * Because every chapter's on-screen footprint equals its §6 budget (see ScrollStory's
 * pin-`end` derivation), document scroll position in vh maps linearly to these values:
 * 1vh === window.innerHeight / 100 px.
 */
export const CREAM_TO_INK: readonly [number, number] = [310, 410];
export const INK_TO_CREAM: readonly [number, number] = [760, 860];

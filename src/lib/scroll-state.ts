/**
 * scroll-state — the per-frame bridge between GSAP ScrollTriggers and the
 * (future) R3F canvas.
 *
 * Design (spec §11 "Architecture"): a plain, module-level mutable singleton.
 * ScrollTriggers WRITE fields here inside their `onUpdate` callbacks; Task 4's
 * `useFrame` READS them every render. This deliberately bypasses React so the
 * constellation can follow scroll at 60fps with ZERO React re-renders. Discrete,
 * ~4-per-scroll chapter changes go through zustand instead (a later task) — this
 * module is only for the continuous, per-frame values.
 *
 * Pure & SSR-safe: no `window`/`document` access at import time, no side effects.
 * Direct mutation is the intended API (e.g. `scrollState.chapterProgress = p`);
 * the tiny reset helper below exists only for teardown/tests.
 */

/**
 * Named constellation formations (spec §6 "Formation" column / §7). scroll-map
 * assigns one per chapter and ScrollTriggers write the active from→to pair into
 * `scrollState`; Task 4 maps these indices to the baked position buffers. Sharing
 * the enum keeps scroll-map and the canvas in agreement about the names.
 */
export const FORMATION = {
  NEBULA: 0,
  LATTICE: 1,
  GRAPH: 2,
  MOONS: 3,
  CALM: 4,
} as const;

export type Formation = (typeof FORMATION)[keyof typeof FORMATION];

export interface ScrollState {
  /** 0..1 progress through the whole document (drives the HUD %). */
  pageProgress: number;
  /** Active chapter index, 0..7. */
  chapter: number;
  /** 0..1 progress within the active pinned chapter. */
  chapterProgress: number;
  /** Constellation formation the morph is coming FROM (a FORMATION value). */
  formationFrom: Formation;
  /** Constellation formation the morph is heading TO (a FORMATION value). */
  formationTo: Formation;
  /** 0..1 blend between `formationFrom` and `formationTo`. */
  morph: number;
  /** Nebula curl-noise drift amplitude; eases 0.15 → 0.04 across About (§6 ch2). */
  noiseAmp: number;
  /** Pointer position normalized to -1..1, for camera/parallax (§7 camera). */
  pointer: { x: number; y: number };
  /**
   * Act blend for the canvas: 0 = cream act, 1 = dark act. ScrollStory's two
   * background crossfade triggers write this in lockstep with the DOM `--bg`
   * paint (Task 4 §7): the constellation/backdrop lerp ALL colours from it and
   * switch Normal→Additive blending at 0.5, so canvas and DOM stay in sync.
   */
  themeBlend: number;
  /**
   * Research row hover seam (§6 ch5 / §7 `uHighlight[5]`): the project-index row
   * under the pointer maps to a moon 0..4 that the constellation brightens 1.4× /
   * scales 1.2×; -1 = none. A delegated `[data-project-row]` listener writes it.
   */
  highlightMoon: number;
  /**
   * Easter-egg spark blend (Task 6 / spec §8), 0..1. The Wordmark's 5-click egg
   * eases this 0→1→0 over 2.5s; the constellation reads it into a shader uniform and
   * blends every particle toward the baked SPARK glyph ON TOP of its normal morph.
   * Because it is a separate top layer, the from→to handoff machine is never touched,
   * so it reverts cleanly even if the user scrolls (any formation) during the 2.5s.
   */
  overrideSpark: number;
}

/**
 * The singleton. Import and mutate directly:
 *   import { scrollState } from "@/lib/scroll-state";
 *   scrollState.chapterProgress = self.progress; // inside a ScrollTrigger onUpdate
 */
export const scrollState: ScrollState = {
  pageProgress: 0,
  chapter: 0,
  chapterProgress: 0,
  formationFrom: FORMATION.NEBULA,
  formationTo: FORMATION.NEBULA,
  morph: 0,
  noiseAmp: 0.15,
  pointer: { x: 0, y: 0 },
  themeBlend: 0,
  highlightMoon: -1,
  overrideSpark: 0,
};

/**
 * Reset every field to its initial value in place (keeps the same object
 * reference so existing readers stay valid). Only needed on full teardown /
 * in tests — normal operation just mutates fields.
 */
export function resetScrollState(): void {
  scrollState.pageProgress = 0;
  scrollState.chapter = 0;
  scrollState.chapterProgress = 0;
  scrollState.formationFrom = FORMATION.NEBULA;
  scrollState.formationTo = FORMATION.NEBULA;
  scrollState.morph = 0;
  scrollState.noiseAmp = 0.15;
  scrollState.pointer.x = 0;
  scrollState.pointer.y = 0;
  scrollState.themeBlend = 0;
  scrollState.highlightMoon = -1;
  scrollState.overrideSpark = 0;
}

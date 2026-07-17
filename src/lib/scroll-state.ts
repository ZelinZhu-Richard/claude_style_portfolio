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
}

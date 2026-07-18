/**
 * Palette hex constants mirroring globals.css (spec §4 "Design system").
 * Exported for non-CSS consumers — the WebGL canvas (R3F/three.js) can't
 * read CSS custom properties, so it imports colors from here directly.
 *
 * Keep in sync with the CSS vars defined in src/app/globals.css.
 */
export const palette = {
  paper: "#FAF9F5",
  paperDeep: "#F0EEE6",
  ink: "#141413",
  slateRaised: "#201F1E",
  terracotta: "#CC785C",
  terracottaHot: "#D97757",
  kraft: "#D4A27F",
  manilla: "#EBDBBC",
  creamGhost: "rgba(250, 249, 245, 0.92)",
  olive: "#7D8A6C",
  /**
   * Warm hairline used for the shielded-lattice edges (spec §7 formation 2:
   * "warm #E8C4A0 alpha 0.25"). Canvas-only — not a DOM surface token — but it
   * lives here so `components/canvas/*` never hard-code a hex (brief constraint).
   */
  latticeLine: "#E8C4A0",
} as const;

export type Palette = typeof palette;
export type PaletteToken = keyof Palette;

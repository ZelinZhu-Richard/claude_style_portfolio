/**
 * Bezel — the fixed 12px-inset rounded-rect frame that gives the site its
 * "viewport in a viewport" cinematic feel (spec §8). 1px hairline stroke, ink 20%
 * on cream, inverting to cream 20% when `[data-theme="dark"]` flips at the dark-act
 * crossfade midpoint. Purely decorative: `aria-hidden`, `pointer-events: none`.
 *
 * Static here. Task 5's loader animates it in (the rect DrawSVGs on entry) — the
 * `.bezel` element is the seam that hook attaches to. Styling lives in globals.css
 * (`.bezel`) so the theme-flip rule can target `[data-theme="dark"] .bezel`.
 *
 * No hooks / no window: intentionally a server component (rendered as a child of
 * the SmoothScroll client boundary), keeping it out of the client bundle.
 */
export default function Bezel() {
  return <div className="bezel" aria-hidden="true" />;
}

/**
 * Text-effect utilities (spec §6 rules A–D). One function per rule; chapters
 * compose them inside their `connect`. See each module for the rule it implements.
 *
 * Naming note: the brief sketches these as `useBlurIn` / `useWordScrub`, but they
 * run INSIDE a gsap-context callback (a chapter's `connect`), not during React
 * render — a `use*` name would (correctly) trip `eslint-plugin-react-hooks`. They
 * are plain composable functions that accept a timeline / element and return the
 * tween or SplitText, exactly the "accept a timeline / return tweens" API the brief
 * allows.
 */

export { blurIn, type BlurInOptions, type BlurInHandle } from "./blurIn";
export { wordScrub, type WordScrubOptions } from "./wordScrub";
export { rise, type RiseOptions } from "./rise";
export { scramble, type ScrambleOptions } from "./scramble";
export { drawIn, type DrawInOptions } from "./drawIn";

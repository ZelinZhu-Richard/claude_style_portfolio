/**
 * Client-side GSAP plugin registration for the Task-3 text-effect utilities
 * (spec §6 rules A–D). Re-exports the plugin classes so the effect modules
 * import from one place.
 *
 * WHY NOT register these at module scope in SmoothScroll.tsx like ScrollTrigger?
 * SmoothScroll is a client component but its module still executes during SSR
 * (Next renders client components on the server). `SplitText.register()` reads
 * `window.innerWidth` WITHOUT a `typeof window` guard, so registering it during
 * SSR throws "window is not defined" and breaks the build. ScrollTrigger guards
 * its own registration, which is why it can live at SmoothScroll's module scope.
 *
 * So the text plugins are registered here behind an explicit browser guard. The
 * guard runs on first client import (chapters import the effect utils, which
 * import this) — always before any effect runs (chapter effects are deferred to
 * `document.fonts.ready`, well after the client bundle has evaluated). SplitText
 * also self-registers on first `new SplitText()`, so this is belt-and-suspenders.
 */

import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

if (typeof window !== "undefined") {
  gsap.registerPlugin(SplitText, ScrambleTextPlugin);
}

export { SplitText, ScrambleTextPlugin };

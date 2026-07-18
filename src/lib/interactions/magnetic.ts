/**
 * Magnetic CTA (spec §8 / §9). Generic over every `[data-magnetic]` element: within a
 * 120px radius the element eases toward the cursor by ≤12px (`gsap.quickTo`, 0.4s,
 * `ease.reveal`) and its label (`[data-magnetic-label]`, defaulting to the element
 * itself) counter-translates ≤4px for a little parallax depth; on leaving the radius it
 * springs home with `ease.magnetic` — the ONLY permitted elastic in the system (§9).
 *
 * ONE delegated `pointermove` on the window (rAF-throttled) drives all magnets; no
 * per-frame React state, no per-element listeners. Reduced-motion / coarse-pointer never
 * reach here — `initMagnetic` is only called from the gated cursor layer.
 */

import { gsap } from "gsap";
import { ease } from "@/lib/motion/tokens";

const RADIUS = 120; // §8 activation radius
const MAX_PULL = 12; // §8 element travel cap
const LABEL_PULL = 4; // §8 label counter-translate cap
const FOLLOW = { duration: 0.4, ease: ease.reveal }; // §8 element follow
const RELEASE = { duration: 0.8, ease: ease.magnetic }; // §9 elastic release (only here)

interface Magnet {
  el: HTMLElement;
  label: HTMLElement;
  x: (v: number) => void;
  y: (v: number) => void;
  lx: (v: number) => void;
  ly: (v: number) => void;
  engaged: boolean;
}

/**
 * Wire magnetic behaviour over all current `[data-magnetic]` elements. Returns a cleanup
 * that removes the listener, kills the tweens and clears every transform.
 */
export function initMagnetic(): () => void {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-magnetic]"));
  const magnets: Magnet[] = nodes.map((el) => {
    const label = el.querySelector<HTMLElement>("[data-magnetic-label]") ?? el;
    return {
      el,
      label,
      x: gsap.quickTo(el, "x", FOLLOW),
      y: gsap.quickTo(el, "y", FOLLOW),
      lx: gsap.quickTo(label, "x", FOLLOW),
      ly: gsap.quickTo(label, "y", FOLLOW),
      engaged: false,
    };
  });
  if (!magnets.length) return () => {};

  let queued = false;
  let mx = 0;
  let my = 0;

  const apply = () => {
    queued = false;
    for (const m of magnets) {
      const r = m.el.getBoundingClientRect();
      const dx = mx - (r.left + r.width / 2);
      const dy = my - (r.top + r.height / 2);
      if (Math.hypot(dx, dy) < RADIUS) {
        m.engaged = true;
        // Lean toward the cursor: full ±MAX_PULL at the radius edge, 0 at the centre.
        const tx = gsap.utils.clamp(-MAX_PULL, MAX_PULL, (dx / RADIUS) * MAX_PULL);
        const ty = gsap.utils.clamp(-MAX_PULL, MAX_PULL, (dy / RADIUS) * MAX_PULL);
        m.x(tx);
        m.y(ty);
        // Label parallax: opposite direction, smaller amplitude.
        m.lx(-tx * (LABEL_PULL / MAX_PULL));
        m.ly(-ty * (LABEL_PULL / MAX_PULL));
      } else if (m.engaged) {
        m.engaged = false;
        // Spring home (elastic only on release, §9). overwrite so it wins over quickTo.
        gsap.to(m.el, { x: 0, y: 0, overwrite: true, ...RELEASE });
        if (m.label !== m.el) gsap.to(m.label, { x: 0, y: 0, overwrite: true, ...RELEASE });
      }
    }
  };

  const onMove = (e: PointerEvent) => {
    mx = e.clientX;
    my = e.clientY;
    if (queued) return;
    queued = true;
    requestAnimationFrame(apply);
  };

  window.addEventListener("pointermove", onMove, { passive: true });

  return () => {
    window.removeEventListener("pointermove", onMove);
    for (const m of magnets) {
      gsap.killTweensOf(m.el);
      gsap.set(m.el, { clearProps: "transform" });
      if (m.label !== m.el) {
        gsap.killTweensOf(m.label);
        gsap.set(m.label, { clearProps: "transform" });
      }
    }
  };
}

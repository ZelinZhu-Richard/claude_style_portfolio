/**
 * Live footer clock (spec §8: "CHAPEL HILL, NC — 14:32:05 America/New_York, 1s tick,
 * colon blinks 50% alpha odd seconds"). Fills a `[data-local-clock]` span.
 *
 * A clock is CONTENT, so it runs for everyone (coarse pointer / reduced motion included);
 * only the blinking colon — the one animated bit — is gated on motion-safe. The DOM is
 * built imperatively in an effect (after hydration), so SSR renders the static `--:--:--`
 * placeholder and there is no hydration mismatch (add `suppressHydrationWarning` to the
 * span). The interval is cleared on unmount.
 */

import { useEffect, type RefObject } from "react";

const TZ = "America/New_York";

export function useLocalClock(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const host = ref.current;
    if (!host) return;

    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // Build once: HH <colon> MM <colon> SS. Reused each tick (no innerHTML re-parse).
    host.textContent = "";
    const hh = document.createElement("span");
    const mm = document.createElement("span");
    const ss = document.createElement("span");
    const c1 = document.createElement("span");
    const c2 = document.createElement("span");
    c1.textContent = ":";
    c2.textContent = ":";
    c1.style.transition = c2.style.transition = "opacity 0.15s linear";
    host.append(hh, c1, mm, c2, ss);

    const blink = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;

    const tick = () => {
      const parts = fmt.formatToParts(new Date());
      const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
      hh.textContent = get("hour");
      mm.textContent = get("minute");
      ss.textContent = get("second");
      // §8: colons at 50% on odd seconds (motion-safe only; steady under reduced motion).
      const dim = blink && Number(get("second")) % 2 === 1 ? "0.5" : "1";
      c1.style.opacity = c2.style.opacity = dim;
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [ref]);
}

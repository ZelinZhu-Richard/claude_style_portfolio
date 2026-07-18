/**
 * Seven original hand-drawn SVG motifs (spec §4 illustration list) + the SafetyAct
 * kill-criteria flow diagram (§6 ch3 beat 2). The site's Anthropic-spirit signature.
 *
 * Technique (§4, binding): each motif is one inline `<svg>` on a 96×96 viewBox / 24px
 * grid; strokes are 1.5px round-cap / round-join `currentColor` (so colour comes from
 * CSS context — ink on cream, cream on terracotta); at most ONE accent path uses
 * `var(--terracotta)` (or `var(--olive)` where semantically "approved"), overridable
 * per placement via the `accent` prop so it stays legible on coloured cards; ≤15
 * paths, each a single continuous stroke (node-dots are strokable `<circle>`s); every
 * svg is `aria-hidden` + `role="presentation"`. Control points are nudged off the
 * grid on purpose — nothing is ruler-straight (the hand-wobble §4 asks for).
 *
 * Strokes animate on via `drawIn` (lib/effects) — these components render the artwork
 * only; the reveal is composed by each chapter's `connect` (or the loader timeline).
 */

import type { SVGProps } from "react";

export type MotifProps = Omit<SVGProps<SVGSVGElement>, "stroke"> & {
  /** Stroke width (spec §4: 1.5). The loader mark overrides to 2. */
  strokeWidth?: number;
  /** Accent-path stroke colour. Default terracotta; pass `currentColor`/`var(--olive)`
   *  on coloured surfaces so the one accent path stays visible. */
  accent?: string;
};

/** Shared wrapper: the §4 stroke contract in one place. */
function Svg({ strokeWidth = 1.5, children, ...rest }: SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      role="presentation"
      {...rest}
    >
      {children}
    </svg>
  );
}

/**
 * ① node-blossom — a plant whose flower is a small node-graph. The site mark
 * (loader / favicon / wordmark). Wobbly stem, two asymmetric leaves, three petal
 * nodes fanned off a central node, one terracotta bloom on top.
 */
export function NodeBlossom({ accent = "var(--terracotta)", ...rest }: MotifProps) {
  return (
    <Svg data-illustration {...rest}>
      <path d="M47 88 C44 74 51 63 48 49" />
      <path d="M48 65 C39 65 32 59 30 50 C39 51 45 57 48 65" />
      <path d="M49 56 C58 55 65 50 67 42 C59 44 52 49 49 56" />
      <path d="M48 46 L37 35" />
      <path d="M48 46 L49 28" />
      <path d="M48 46 L60 36" />
      <circle cx="48" cy="46" r="2.4" />
      <circle cx="36" cy="34" r="2.4" />
      <circle cx="61" cy="35" r="2.4" />
      <circle cx="49" cy="26" r="2.8" stroke={accent} />
    </Svg>
  );
}

/**
 * ② head with a constellation — a one-stroke right-facing profile (crown, nose bump,
 * chin) containing a four-node graph where a mind would be. Accent node terracotta.
 */
export function HeadConstellation({ accent = "var(--terracotta)", ...rest }: MotifProps) {
  return (
    <Svg data-illustration {...rest}>
      <path d="M49 15 C32 14 22 29 24 45 C25 56 31 64 41 68 C47 71 53 72 57 69 L58 61 C62 60 64 56 61 53 L67 47 C64 45 62 44 60 43 C66 39 66 28 60 22 C56 17 53 15 49 15 Z" />
      <path d="M40 35 L51 30 L55 41 L44 44 Z" />
      <path d="M51 30 L44 44" />
      <circle cx="40" cy="35" r="1.9" />
      <circle cx="51" cy="30" r="1.9" />
      <circle cx="55" cy="41" r="1.9" />
      <circle cx="44" cy="44" r="1.9" stroke={accent} />
    </Svg>
  );
}

/**
 * ③ hatched shield with a watching eye — a heater shield engraved with parallel
 * hatch strokes, one open eye at its centre. Terracotta pupil (Scutum "watches").
 */
export function HatchedShield({ accent = "var(--terracotta)", ...rest }: MotifProps) {
  return (
    <Svg data-illustration {...rest}>
      <path d="M24 22 L72 23 C74 45 69 63 48 78 C27 63 22 45 24 22 Z" />
      <path d="M31 33 L39 41" />
      <path d="M58 32 L66 40" />
      <path d="M33 57 L42 66" />
      <path d="M44 59 L52 67" />
      <path d="M54 56 L61 63" />
      <path d="M37 49 C43 43 54 43 60 49 C54 55 43 55 37 49 Z" />
      <circle cx="48" cy="49" r="3.1" stroke={accent} />
    </Svg>
  );
}

/**
 * ④ hand cradling a node-star + olive check — an open cupped palm holding a small
 * radiant node-star, blessed with an olive "human approved" checkmark (§4: dark-act
 * close, "the last approval is always human").
 */
export function HandCradle({ accent = "var(--olive)", ...rest }: MotifProps) {
  return (
    <Svg data-illustration {...rest}>
      <path d="M20 54 C22 71 35 82 50 82 C65 82 78 71 80 54" />
      <path d="M20 54 C18 48 20 44 25 43" />
      <circle cx="50" cy="34" r="2.2" />
      <path d="M50 34 L50 20" />
      <path d="M50 34 L62 27" />
      <path d="M50 34 L61 42" />
      <path d="M50 34 L39 42" />
      <path d="M50 34 L38 27" />
      <path d="M40 66 L46 72 L58 58" stroke={accent} />
    </Svg>
  );
}

/**
 * ⑤ two hands passing a node-lantern — a hung lantern whose light is a three-node
 * graph, handed left-to-right between two cupped palms (Community, cream on
 * terracotta — no accent needed on the coloured card).
 */
export function HandsLantern({ accent = "currentColor", ...rest }: MotifProps) {
  return (
    <Svg data-illustration {...rest}>
      <path d="M40 42 C40 38 56 38 56 42 L57 60 C57 65 39 65 39 60 Z" />
      <path d="M44 42 C44 33 52 33 52 42" />
      <path d="M48 33 L48 27" />
      <path d="M44 50 L52 50 L48 58 Z" stroke={accent} />
      <circle cx="44" cy="50" r="1.5" />
      <circle cx="52" cy="50" r="1.5" />
      <circle cx="48" cy="58" r="1.5" />
      <path d="M10 70 C16 62 22 60 28 62 C26 56 28 51 33 50" />
      <path d="M28 62 C30 58 30 55 28 52" />
      <path d="M86 70 C80 62 74 60 68 62 C70 56 68 51 63 50" />
      <path d="M68 62 C66 58 66 55 68 52" />
    </Svg>
  );
}

/**
 * ⑥ winding milestone path — a dotted switchback trail climbing past three planted
 * flags, the last one terracotta (the goal). Research's spine motif.
 */
export function MilestonePath({ accent = "var(--terracotta)", ...rest }: MotifProps) {
  return (
    <Svg data-illustration {...rest}>
      <path d="M22 84 C27 76 30 71 33 65 C37 55 43 50 48 44 C54 37 60 29 66 20" />
      <circle cx="33" cy="65" r="1.6" />
      <circle cx="48" cy="44" r="1.6" />
      <circle cx="66" cy="20" r="1.6" />
      <path d="M33 65 L33 55" />
      <path d="M33 55 L43 58 L33 61" />
      <path d="M48 44 L48 34" />
      <path d="M48 34 L58 37 L48 40" />
      <path d="M66 20 L66 10" />
      <path d="M66 10 L76 13 L66 16" stroke={accent} />
    </Svg>
  );
}

/**
 * ⑦ paper plane trailing orbiting nodes — an origami dart climbing up-right, a
 * curl of exhaust behind it, and three little nodes orbiting the tail (Contact,
 * cream on terracotta).
 */
export function PaperPlane({ accent = "currentColor", ...rest }: MotifProps) {
  return (
    <Svg data-illustration {...rest}>
      <path d="M20 60 L82 22 L50 54 Z" />
      <path d="M82 22 L44 48 L20 60" />
      <path d="M44 48 L50 54" />
      <ellipse cx="26" cy="61" rx="15" ry="5.5" transform="rotate(-22 26 61)" />
      <circle cx="40" cy="54" r="1.6" />
      <circle cx="12" cy="68" r="1.8" />
      <circle cx="26" cy="61" r="1.3" stroke={accent} />
    </Svg>
  );
}

/**
 * Hover arrow (spec §8 "hand-drawn arrow DrawSVGs in on hover"). A tiny 3-stroke
 * right-pointing arrow — a slightly wobbly shaft + two head strokes — in `currentColor`,
 * on a 28×24 viewBox. NOT one of the seven motifs: it is the reveal that draws on
 * research-row / community-card hover (`lib/interactions/hoverArrows`). Its strokes match
 * the DRAWABLE selector so DrawSVG animates them; it renders undrawn (the wiring sets
 * `drawSVG:0`) so there is no flash before first hover.
 */
export function HoverArrow(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 28 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      role="presentation"
      data-hover-arrow
      {...props}
    >
      <path d="M3 12 C10 11.4 18 12 24 12" />
      <path d="M17 5 L24 12" />
      <path d="M17 19 L24 12" />
    </svg>
  );
}

/**
 * SafetyAct kill-criteria flow diagram (§6 ch3 beat 2, scrub 0.44–0.62). NOT one of
 * the seven motifs — a bespoke four-box flow (hypothesize → backtest → referee →
 * kill) built from the same confident strokes, with 8px mono labels. The "kill" box
 * is terracotta. Boxes + arrows draw via `drawIn` (they match the DRAWABLE selector);
 * the `<text>` labels fade in separately (SafetyAct.connect). Wider viewBox (320×96)
 * because it lays out horizontally in the reserved slot.
 */
export function KillCriteriaDiagram({ accent = "var(--terracotta)", ...rest }: SVGProps<SVGSVGElement> & { accent?: string }) {
  // 4 boxes W=62 + 3 gaps G=18 span 8 → 310 inside the 320 viewBox (10px right margin).
  const W = 62;
  const STRIDE = W + 18;
  const boxes = [
    { label: "hypothesize" },
    { label: "backtest" },
    { label: "referee" },
    { label: "kill", kill: true },
  ].map((b, i) => ({ ...b, x: 8 + i * STRIDE }));
  return (
    <svg
      viewBox="0 0 320 96"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      role="presentation"
      {...rest}
    >
      {boxes.map((b) => (
        <rect
          key={b.label}
          x={b.x}
          y={24}
          width={W}
          height={34}
          rx={6}
          stroke={b.kill ? accent : "currentColor"}
        />
      ))}
      {/* arrows across each gap (shaft + head, each a stroke) */}
      {boxes.slice(0, 3).map((b) => {
        const from = b.x + W;
        const to = b.x + STRIDE;
        return (
          <g key={`a-${b.label}`}>
            <path d={`M${from} 41 L${to} 41`} />
            <path d={`M${to - 5} 37 L${to} 41 L${to - 5} 45`} />
          </g>
        );
      })}
      {boxes.map((b) => (
        <text
          key={`t-${b.label}`}
          data-diagram-label
          x={b.x + W / 2}
          y={44}
          textAnchor="middle"
          fill="currentColor"
          stroke="none"
          style={{ font: "8px var(--font-mono, monospace)", letterSpacing: "0.04em", textTransform: "uppercase" }}
        >
          {b.label}
        </text>
      ))}
    </svg>
  );
}

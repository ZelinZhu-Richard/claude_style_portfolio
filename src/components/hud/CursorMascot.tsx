"use client";

/**
 * The Claude Code mascot, drawn as vector pixel-art for use as the custom cursor.
 *
 * Geometry was derived from the source artwork (see docs/assets/cursor-reference/)
 * by decoding both images to a pixel-block map and reading off the spans, not by
 * eye. The artwork sits on a square 10-unit grid — 11 units wide by 8.6 tall —
 * which is why the viewBox is 110×86 and every coordinate below is a multiple of
 * 10 (eyes land on exactly 1×1 cells; the four legs are symmetric about x=55).
 *
 * The source files could not be used directly: the .jpg carries a solid #f8f8f8
 * background and the .png's "transparency" checkerboard is baked into its pixels
 * (every alpha byte is 0xff), so either would drag a light rectangle across the
 * page — glaring on the dark act. Redrawing also lets the BODY stay pixel-identical
 * between expressions, so pressing reads as the character reacting rather than as
 * an image swap, and it can never jump or resize.
 *
 * Both eye sets are always mounted; `Cursor` crossfades them through refs, so a
 * press never triggers a React re-render.
 */

import type { RefObject } from "react";
import { palette } from "@/lib/theme";

const BODY = palette.terracottaHot; // #D97757 — the brand token nearest the artwork's sampled #D87859
const EYE = palette.ink;

// Eye cells on the 10-unit grid: left x20–30, right x80–90, both y21–31.
// Chevrons are filled polygons (not strokes) to keep the blocky pixel character.
const CHEVRON_LEFT = "20.5,21 29.5,26 20.5,31 20.5,28 25,26 20.5,24"; // ">"
const CHEVRON_RIGHT = "89.5,21 80.5,26 89.5,31 89.5,28 85,26 89.5,24"; // "<"

type Props = {
  width: number;
  normalEyesRef: RefObject<SVGGElement | null>;
  happyEyesRef: RefObject<SVGGElement | null>;
};

export default function CursorMascot({ width, normalEyesRef, happyEyesRef }: Props) {
  return (
    <svg
      width={width}
      height={(width * 86) / 110}
      viewBox="0 0 110 86"
      fill="none"
      aria-hidden="true"
      role="presentation"
      style={{ display: "block", overflow: "visible" }}
    >
      {/* Body: torso, the ear band that overhangs both sides, and four legs. */}
      <g fill={BODY}>
        <rect x="10" y="0" width="90" height="64" />
        <rect x="0" y="21" width="110" height="22" />
        <rect x="10" y="64" width="10" height="22" />
        <rect x="30" y="64" width="10" height="22" />
        <rect x="70" y="64" width="10" height="22" />
        <rect x="90" y="64" width="10" height="22" />
      </g>

      {/* Resting eyes — two solid squares. */}
      <g ref={normalEyesRef} fill={EYE}>
        <rect x="20" y="21" width="10" height="10" />
        <rect x="80" y="21" width="10" height="10" />
      </g>

      {/* Pressed eyes — happy chevrons. Hidden until Cursor fades them in. */}
      <g ref={happyEyesRef} fill={EYE} style={{ opacity: 0 }}>
        <polygon points={CHEVRON_LEFT} />
        <polygon points={CHEVRON_RIGHT} />
      </g>
    </svg>
  );
}

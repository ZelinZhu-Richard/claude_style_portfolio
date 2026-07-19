import { ImageResponse } from "next/og";
import { SITE_TITLE } from "@/lib/site-config";

// Static 1200×630 OG card (spec §12): no DOM, no canvas — just ImageResponse's
// flexbox-subset JSX + two fetched Google-font files (the bold display weight
// for the wordmark, italic serif for the one emotive word in the tagline —
// the site's signature move, spec §5/§6). Next serves this automatically as
// both `og:image` and `twitter:image` since no sibling `twitter-image.tsx`
// exists. Left on the default (nodejs) runtime rather than edge: nothing here
// needs edge, and it lets Next prerender the image once at build time instead
// of on every request.
//
// Because this prerenders at BUILD time, `loadFont` below is guarded: a
// transient network blip or Google rotating the hashed font URL must not fail
// the whole `pnpm build` on Vercel. On any fetch failure it returns `null`,
// and the render falls back to satori's bundled default font — still an
// intentional-looking card (see the `fontsLoaded` branch), not a broken one.
export const alt = SITE_TITLE;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#141413";
const PAPER = "#faf9f5";
const TERRACOTTA = "#cc785c";

// Same paths as src/app/icon.svg / NodeBlossom (src/components/illustrations/index.tsx) —
// duplicated here (not imported) because ImageResponse's renderer (satori) needs literal
// <path>/<circle> primitives in the tree, not an imported React component.
function NodeBlossomMark() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 96 96"
      fill="none"
      stroke={INK}
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M47 88 C44 74 51 63 48 49" />
      <path d="M48 65 C39 65 32 59 30 50 C39 51 45 57 48 65" />
      <path d="M49 56 C58 55 65 50 67 42 C59 44 52 49 49 56" />
      <path d="M48 46 L37 35" />
      <path d="M48 46 L49 28" />
      <path d="M48 46 L60 36" />
      <circle cx="48" cy="46" r="3" />
      <circle cx="36" cy="34" r="3" />
      <circle cx="61" cy="35" r="3" />
      <circle cx="49" cy="26" r="3.4" stroke={TERRACOTTA} />
    </svg>
  );
}

const SCHIBSTED_BOLD_URL =
  "https://fonts.gstatic.com/s/schibstedgrotesk/v7/JqzK5SSPQuCQF3t8uOwiUL-taUTtarVKQ9vZ6pJJWlMNxcYATw.ttf";
const SOURCE_SERIF_ITALIC_URL =
  "https://fonts.gstatic.com/s/sourceserif4/v14/vEF02_tTDB4M7-auWDN0ahZJW1ge6NmXpVAHV83Bfb_US2D2QYxoUKIkn98pRl9dCw.ttf";

// Never throws: a non-2xx response or a network/DNS failure (Google rotating the
// hashed URL, a transient blip during Vercel's build) resolves to `null` instead of
// rejecting, so `Promise.all` below can't fail the build. Callers render a
// still-intentional fallback (system font, terracotta accent) when this happens.
async function loadFont(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const [schibstedBold, sourceSerifItalic] = await Promise.all([
    loadFont(SCHIBSTED_BOLD_URL),
    loadFont(SOURCE_SERIF_ITALIC_URL),
  ]);
  const fontsLoaded = schibstedBold !== null && sourceSerifItalic !== null;
  // Explicit "sans-serif" string, NOT `undefined`, when the fetch failed: satori
  // parses `fontFamily` as a CSS value (splits it into a font stack) and throws on
  // `undefined` rather than falling back gracefully — an empty/omitted value here
  // crashes the whole prerender, exactly the build failure this guard exists to
  // prevent. A real fallback family name is required, not just "no font data".
  const displayFont = fontsLoaded ? "Schibsted Grotesk" : "sans-serif";
  const serifFont = fontsLoaded ? "Source Serif 4" : "sans-serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: PAPER,
          padding: "80px 96px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 14,
            background: TERRACOTTA,
            display: "flex",
          }}
        />
        <NodeBlossomMark />
        <div
          style={{
            marginTop: 40,
            fontFamily: displayFont,
            fontWeight: 700,
            fontSize: 64,
            letterSpacing: -1,
            color: INK,
            display: "flex",
          }}
        >
          ZELIN (RICHARD) ZHU
        </div>
        <div
          style={{
            marginTop: 24,
            display: "flex",
            fontSize: 36,
            color: INK,
          }}
        >
          {/* "AI that"/"trust." stay on the plain system sans regardless of fontsLoaded
              (only the BOLD Schibsted Grotesk face is ever registered — see `fonts`
              below — so requesting it at the default weight here would be ambiguous). */}
          <span style={{ fontFamily: "sans-serif" }}>AI&nbsp;that&nbsp;</span>
          <span
            style={
              fontsLoaded
                ? { fontFamily: serifFont, fontStyle: "italic", fontWeight: 400 }
                : // No italic serif to fall back to (satori's bundled default has no
                  // italic face) — the terracotta accent color carries the same
                  // "one emphasised word" signature instead (spec §4's one-accent
                  // rule), so the fallback still reads as deliberate, not broken.
                  { fontFamily: "sans-serif", fontWeight: 700, color: TERRACOTTA }
            }
          >
            earns
          </span>
          <span style={{ fontFamily: "sans-serif" }}>&nbsp;trust.</span>
        </div>
      </div>
    ),
    {
      ...size,
      // `undefined`, NOT `[]`, when nothing loaded: @vercel/og resolves fonts as
      // `options.fonts || defaultFonts` internally (its own bundled Noto Sans),
      // and `[] || x` short-circuits to `[]` because an empty array is truthy in
      // JS — passing `fonts: []` here skips that fallback and satori throws ("No
      // fonts are loaded"), which would fail the whole build exactly like the
      // unguarded fetch this change is meant to protect against. `undefined`
      // correctly falls through to the bundled default.
      fonts: fontsLoaded
        ? [
            { name: "Schibsted Grotesk", data: schibstedBold as ArrayBuffer, weight: 700, style: "normal" },
            { name: "Source Serif 4", data: sourceSerifItalic as ArrayBuffer, weight: 400, style: "italic" },
          ]
        : undefined,
    }
  );
}

import { ImageResponse } from "next/og";
import { SITE_TITLE } from "@/lib/site-config";

// Static 1200×630 OG card (spec §12). Edge-safe: no DOM, no canvas — just
// ImageResponse's flexbox-subset JSX + two fetched Google-font files (the
// bold display weight for the wordmark, italic serif for the one emotive
// word in the tagline — the site's signature move, spec §5/§6). Next
// serves this automatically as both `og:image` and `twitter:image` since
// no sibling `twitter-image.tsx` exists. Left on the default (nodejs)
// runtime rather than edge: nothing here needs edge, and it lets Next
// prerender the image once at build time instead of on every request.
export const alt = SITE_TITLE;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#141413";
const PAPER = "#faf9f5";
const TERRACOTTA = "#cc785c";

// Same paths as src/app/icon.svg / NodeBlossom (src/components/illustrations/index.tsx) —
// duplicated here (not imported) because this route runs on the edge runtime and
// ImageResponse needs the raw <path>/<circle> elements inline.
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

async function loadFont(url: string) {
  const res = await fetch(url);
  return res.arrayBuffer();
}

export default async function OpengraphImage() {
  const [schibstedBold, sourceSerifItalic] = await Promise.all([
    loadFont(
      "https://fonts.gstatic.com/s/schibstedgrotesk/v7/JqzK5SSPQuCQF3t8uOwiUL-taUTtarVKQ9vZ6pJJWlMNxcYATw.ttf"
    ),
    loadFont(
      "https://fonts.gstatic.com/s/sourceserif4/v14/vEF02_tTDB4M7-auWDN0ahZJW1ge6NmXpVAHV83Bfb_US2D2QYxoUKIkn98pRl9dCw.ttf"
    ),
  ]);

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
            fontFamily: "Schibsted Grotesk",
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
          <span style={{ fontFamily: "sans-serif" }}>AI&nbsp;that&nbsp;</span>
          <span
            style={{
              fontFamily: "Source Serif 4",
              fontStyle: "italic",
              fontWeight: 400,
            }}
          >
            earns
          </span>
          <span style={{ fontFamily: "sans-serif" }}>&nbsp;trust.</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Schibsted Grotesk", data: schibstedBold, weight: 700, style: "normal" },
        { name: "Source Serif 4", data: sourceSerifItalic, weight: 400, style: "italic" },
      ],
    }
  );
}

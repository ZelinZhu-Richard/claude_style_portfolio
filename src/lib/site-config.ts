/**
 * Single source of truth for the deployed origin (spec §12). Metadata (layout),
 * the OG image route, JSON-LD, robots.ts, and sitemap.ts all read from here —
 * swap this one const when a custom domain replaces the Vercel default.
 */
export const SITE_URL = "https://claude-style-portfolio.vercel.app";

export const SITE_NAME = "Zelin (Richard) Zhu";

export const SITE_TITLE = "Zelin (Richard) Zhu — AI Safety Builder & Researcher";

// No age anywhere in metadata (user decision #5) — this string is exact, verbatim.
export const SITE_DESCRIPTION =
  "AI safety builder and researcher in Chapel Hill, NC — agent audit tooling, Claude-grounded community platforms, and research headed for ICLR.";

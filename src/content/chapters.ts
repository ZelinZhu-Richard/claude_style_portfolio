/**
 * All site copy, typed and centralized.
 *
 * Source of truth: docs/superpowers/specs/2026-07-17-personal-site-design.md, §5
 * "Narrative & copy" (plus the 7 Anthropic Academy certification names, which the
 * spec references but does not enumerate — sourced verbatim from public/Zelin_Zhu_CV.pdf,
 * the CV the spec itself is built from).
 *
 * Components must import copy from here rather than hardcoding strings.
 */

/**
 * A headline with one emotive word set in italic serif (the site's signature move).
 * `em` is omitted for the one headline in §5 that carries no italicized word
 * (Ch3 Safety: "Show your work.") — the full text lives in `pre` in that case.
 */
export interface Headline {
  pre: string;
  em?: string;
  post: string;
}

/** A single stat tile. `value` is the counted/emphasized figure, `label` the caption. */
export interface StatTile {
  value: string;
  label: string;
}

/** A feature/project/institution card. */
export interface ProjectCard {
  title: string;
  /** Optional role/kicker shown above the title, e.g. "Lead Researcher". */
  eyebrow?: string;
  body?: string;
  /** For list-style cards (e.g. certifications) instead of/alongside prose. */
  items?: string[];
  variant?: "paper" | "terracotta" | "slate";
  compact?: boolean;
  href?: string;
}

/** A hoverable row in the research project index. */
export interface IndexRow {
  title: string;
  description?: string;
  href?: string;
}

/** A pill-shaped affiliation/role chip, optionally grouped under a heading. */
export interface Chip {
  label: string;
  group?: string;
}

/** A labeled outbound link. */
export interface Link {
  label: string;
  href: string;
}

/** Shared shape for narrative chapters. Not every chapter uses every field. */
export interface Chapter {
  id: string;
  headline: Headline;
  sub?: string;
  body?: string;
}

export interface HeroChapter extends Chapter {
  /**
   * The person's name — the giant display `<h1>` (spec §6 ch1: "name at
   * clamp(96px,14vw,220px)"). Stored proper-case for a11y/SEO; the hero uppercases
   * it visually via CSS. §5 embeds it inside `sub`; hoisting it to its own field
   * keeps the h1 free of literals.
   */
  name: string;
  /** Mono meta row, e.g. "AI SAFETY × COMMUNITY · EN / 中文 · SCROLL ↓". */
  meta: string;
}

export interface AboutChapter extends Chapter {
  stats: StatTile[];
  cards: ProjectCard[];
}

export interface SafetyChapter extends Chapter {
  cards: ProjectCard[];
  /** The dark-act closing line, e.g. "The last approval is always *human*." */
  closingLine: Headline;
}

export interface CommunityChapter extends Chapter {
  cards: ProjectCard[];
  chips: Chip[];
}

export interface ResearchChapter extends Chapter {
  institutions: ProjectCard[];
  index: IndexRow[];
}

export interface HonorsSection {
  /** Mono label, e.g. "HONORS — IN PASSING". */
  label: string;
  items: string[];
}

export interface ContactChapter extends Chapter {
  cta: Link;
  links: Link[];
  /** Mono meta row parts. The clock's HH:MM:SS is rendered live by a later task. */
  meta: {
    location: string;
    languages: string;
    status: string;
  };
  colophon: string;
}

export const hero: HeroChapter = {
  id: "hero",
  name: "Zelin (Richard) Zhu",
  headline: { pre: "I build AI that ", em: "earns", post: " trust." },
  sub: "Zelin (Richard) Zhu — AI safety builder & researcher in Chapel Hill, North Carolina.",
  body: "Forty-eight public repositories. One rule that never changes: a human stays in the loop.",
  meta: "AI SAFETY × COMMUNITY · EN / 中文 · SCROLL ↓",
};

export const about: AboutChapter = {
  id: "about",
  headline: { pre: "Self-directed, not ", em: "self-contained", post: "." },
  body: "I didn't wait for permission to start. I taught myself multivariable calculus and linear algebra from MIT OpenCourseWare, enrolled at Durham Tech and UNC while finishing high school, and learned the rest by shipping — in public, where anyone can check my work.",
  stats: [
    { value: "48", label: "repos" },
    { value: "7", label: "Anthropic Academy certs" },
    { value: "4.00", label: "GPA" },
    { value: "60+", label: "attendees" },
    { value: "3-person", label: "team" },
    { value: "top ~5%", label: "of 50,000 — YC Startup School, youngest at 17" },
  ],
  cards: [
    {
      title: "Education",
      body: "CHHS '27 Summa Cum Laude, APs, Durham Tech, UNC",
      variant: "paper",
    },
    {
      title: "Anthropic Academy",
      variant: "terracotta",
      items: [
        "Claude 101",
        "Claude Code 101",
        "AI Fluency: Framework & Foundations",
        "AI Fluency for Nonprofits",
        "Introduction to Claude Cowork",
        "Teaching AI Fluency",
        "Introduction to Model Context Protocol",
      ],
    },
  ],
};

export const safety: SafetyChapter = {
  id: "safety",
  headline: { pre: "Show your work.", post: "" },
  sub: "Agents make moves. I make them leave a record.",
  body: "I got interested in AI safety the practical way: I gave agents real capabilities and watched what they tried. Everything I've built since starts from the same premise — autonomy is only useful if you can audit it, replay it, and stop it.",
  cards: [
    {
      title: "Scutum",
      body: "An audit layer for coding agents. Records every execution, risk-scores every tool call, blocks dangerous actions, and routes the rest to a human approval queue. Incidents replay as timelines. There's a prompt-injection demo — try to break it.",
      href: "https://scutum-orpin.vercel.app",
      variant: "slate",
    },
    {
      title: "Quantlab",
      body: "An autonomous research lab built to prove itself wrong. A five-stage agent loop tests trading hypotheses against kill criteria pre-registered in git, a frozen backtest engine, an independent referee model, and a deflated Sharpe. Most hypotheses die. That's the point.",
      variant: "slate",
    },
    {
      title: "Al9ha",
      body: "The agent layer proposes and a human disposes: paper trading is approval-gated. Nothing executes until I sign off.",
      variant: "slate",
      compact: true,
    },
  ],
  closingLine: { pre: "The last approval is always ", em: "human", post: "." },
};

export const community: CommunityChapter = {
  id: "community",
  headline: { pre: "Bring your people ", em: "with", post: " you." },
  sub: "The Triangle raised me on free planetarium shows and open lab doors. I'm paying that back early.",
  cards: [
    {
      title: "RTP Pathway",
      body: "A Claude-grounded opportunity platform for Triangle-area students. Every listing is verified through a human review queue; natural-language search is answered by Claude, grounded in the verified database with source attribution. Trustworthy answers, on purpose.",
      variant: "terracotta",
    },
    {
      title: "Durham AI Literacy Workshop",
      body: "I founded our UNA-USA chapter (SDGs 8, 9, 13) and organized AI-literacy programming for 60+ community members — sponsored by Meta and Perplexity.",
      variant: "terracotta",
    },
    {
      title: "Zhu Academy",
      body: "Knowledge-graph adaptive learning pathways — teaching the way I learned.",
      variant: "terracotta",
      compact: true,
    },
  ],
  chips: [
    { group: "President", label: "AI Club" },
    { group: "President", label: "CS Club" },
    { group: "President", label: "Research & Innovation Club" },
    { group: "Boards", label: "Morehead Planetarium Teen Science Café" },
    { group: "Boards", label: "Museum of Life and Science" },
  ],
};

export const research: ResearchChapter = {
  id: "research",
  headline: { pre: "Curiosity, ", em: "peer-reviewed", post: "." },
  sub: "Research groups, quant teams, a company of my own — and a manuscript on the way.",
  institutions: [
    {
      title: "UNC ACM Lab",
      eyebrow: "Lead Researcher",
      body: "I lead a three-person team studying multi-agent AI through a cognitive-science lens. Manuscript in preparation for ICLR 2027.",
      variant: "paper",
    },
    {
      title: "UNC PRIMES",
      body: "ML and computer-vision research. Invited back to continue.",
      variant: "paper",
    },
    {
      title: "MeridianAlgo",
      body: "Apex Analysis: an open-source ML stock platform, built with a five-person team.",
      variant: "paper",
    },
    {
      title: "Al9ha",
      eyebrow: "Founder",
      body: "AI-native quant research: MoE forecasting (TFT, N-BEATS, MAML), regime-aware gating, a multi-LLM agent layer — and the approval gate from Act II.",
      variant: "paper",
    },
  ],
  index: [
    {
      title: "EqualVoice",
      description: "2–6× ASR error gap for non-native speakers; Duke SCAI finalist — all-high-school team vs grad/PhD teams",
    },
    {
      title: "Research Email Agent",
      description: "Kaggle capstone, Google ADK",
    },
    {
      title: "Wharton HSDSC",
      description: "captain, ensemble modeling",
    },
    {
      title: "+40 more on GitHub →",
      href: "https://github.com/ZelinZhu-Richard",
    },
  ],
};

export const honors: HonorsSection = {
  label: "HONORS — IN PASSING",
  items: [
    "USACO GOLD",
    "DUKE SCAI FINALIST 2026",
    "GT STATS TOP-40 / 1ST-PLACE CAPTAIN",
    "WHARTON HSDSC & INVESTMENT CAPTAIN",
    "YC ~TOP 5% OF 50,000",
    "SUMMA CUM LAUDE",
  ],
};

export const contact: ContactChapter = {
  id: "contact",
  headline: { pre: "Build something ", em: "with", post: " me." },
  sub: "Open to research collaborations, internships, and ambitious projects — especially ones that need to be trustworthy.",
  cta: { label: "Say hello", href: "mailto:richardrizzling@gmail.com" },
  links: [
    { label: "github.com/ZelinZhu-Richard", href: "https://github.com/ZelinZhu-Richard" },
    { label: "zelinzhu-richard.github.io", href: "https://zelinzhu-richard.github.io" },
  ],
  meta: {
    location: "CHAPEL HILL, NC",
    languages: "EN / 中文",
    status: "status: building",
  },
  colophon: "Designed & built by me. Next.js, GSAP, react-three-fiber. Set in Schibsted Grotesk & Source Serif 4.",
};

export const chapters = {
  hero,
  about,
  safety,
  community,
  research,
  honors,
  contact,
};

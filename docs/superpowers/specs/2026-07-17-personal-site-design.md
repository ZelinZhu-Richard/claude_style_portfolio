# Zelin (Richard) Zhu — Cinematic Personal Site (Claude/Anthropic style)

**Merged design spec + implementation plan — validated with user section-by-section on 2026-07-17.** At scaffold time, copy this into the repo as `docs/superpowers/specs/2026-07-17-personal-site-design.md` and commit.

## 1. Context

Personal website built from Zelin's CV ([Zelin_Zhu_CV.pdf](Zelin_Zhu_CV.pdf)), themed on **AI safety and community**, in the **Anthropic/Claude visual identity** (cream paper, terracotta cards, hand-drawn ink line illustrations — per his screenshot), with the **scroll-driven cinematic style of stringtune.fiddle.digital** (his reference video: pinned chapter scenes, 3D hero object traveling between scenes, giant display type, blur-in text, scroll-scrubbed paragraph highlights, scroll-% HUD, dark→light act change, rounded viewport bezel). Quality bar: Awwwards.

## 2. User-confirmed decisions

1. **Full scroll-story** (~1400vh, 8 chapters), not a conventional portfolio.
2. **Cream with a dark act**: opens Anthropic cream; AI-safety chapter sinks to near-black ink; returns warm for community.
3. **Hero object = 3D node constellation** (neural net AND community graph), morphing per chapter.
4. **Next.js 15 → Vercel.**
5. **Age mentioned once, quietly** — only the About stat tile ("top ~5% of 50,000 — YC Startup School, youngest at 17"). Never in the hero. No age in SEO description.
6. **Drop `vanta` + `shadergradient` packages** (vanta pins three r134 → duplicate three + second WebGL context; shadergradient requires its own canvas). Recreate both looks with custom shaders inside the one R3F canvas. GSAP, Lenis, R3F stay; react-bits consumed by vendoring only.
7. **Typography: Schibsted Grotesk (display) + Source Serif 4 (body) + JetBrains Mono (meta)** — chosen visually over Space Grotesk/Newsreader and Hanken/Lora.
8. **Terracotta-forward surfaces** — solid terracotta feature cards with cream line-work (matches screenshot), chosen visually over paper-forward.
9. **Everything in v1** — polish tier (loader, custom cursor, magnetic buttons, velocity marquee, live clock, easter egg) included, sequenced last.

## 3. Stack, dependencies & scaffold

**Verified July 2026:** `next@^15.5` (15.5.18+, security-patched line) · `react@^19.2` · `@react-three/fiber@^9.6` (v9 required for React 19) · `@react-three/drei@^10.7` (minimal use) · `three@~0.180` + `@types/three` · `gsap@^3.15` + `@gsap/react@^2.1` (ScrollTrigger, SplitText, DrawSVG, ScrambleText — all free since 3.13; no ScrollSmoother, Lenis owns smoothing) · `lenis@^1.3` (package is `lenis`, React via `lenis/react`) · `zustand@^5` (discrete chapter state only).

```bash
cd /Users/richardzhu/dev/claude_style_site
mv Zelin_Zhu_CV.pdf <scratchpad>/          # create-next-app needs an empty dir
pnpm dlx create-next-app@15 . --typescript --app --tailwind --eslint --src-dir --turbopack --import-alias "@/*"
mv <scratchpad>/Zelin_Zhu_CV.pdf public/
git init && git add -A && git commit -m "scaffold: next 15 app router"
# commit this spec: docs/superpowers/specs/2026-07-17-personal-site-design.md
pnpm add three @react-three/fiber @react-three/drei gsap @gsap/react lenis zustand
pnpm add -D @types/three
# optional per-component vendoring: pnpm dlx shadcn@latest add @react-bits/<Component>-TS-TW → src/components/vendor/
```

## 4. Design system

**Palette (CSS vars on `<html>`, tweened by GSAP; `data-theme="dark"` for non-animatable styles):**

| Token | Hex | Usage |
|---|---|---|
| `--paper` | `#FAF9F5` | page background |
| `--paper-deep` | `#F0EEE6` | section wells, tiles on cream |
| `--ink` | `#141413` | text on cream; **and** dark-act background |
| `--slate-raised` | `#201F1E` | dark-act cards |
| `--terracotta` | `#CC785C` | feature cards, display accents |
| `--terracotta-hot` | `#D97757` | hover/active/links only |
| `--kraft` / `--manilla` | `#D4A27F` / `#EBDBBC` | chips, secondary tiles |
| `--cream-ghost` | `rgba(250,249,245,.92)` | text on dark |
| `--olive` | `#7D8A6C` | **exclusively** "human approved" semantics (Scutum states, checks, status dot) |
| `--hairline` | 12% ink on cream / 14% cream on dark | borders |

Rules: terracotta text on paper only ≥32px (3.1:1). On terracotta cards: headlines `--paper` (large), body `--ink` (5.7:1 AA), illustrations cream strokes. Body links: ink + terracotta-hot underline.

**Type:** Schibsted Grotesk 500 display — tracking −0.03em, line-height 0.95, `display-xl: clamp(3.5rem, 10vw, 10rem)` up to ~12vw for chapter headlines; one emotive word per headline in **Source Serif 4 italic** (the signature move); `tabular-nums` for counters. Source Serif 4 body 1.125rem/1.65. JetBrains Mono 400 only for HUD %, audit-log motifs, footer meta, chapter labels (`ACT II — SAFETY`, uppercase, +0.08em). Fonts via `next/font/google`, display swap, latin subset.

**Surfaces:** terracotta-forward; radii 24px cards / 999px pills / 12px chips / 16px media; **no shadows** — hairlines + hover `translateY(-4px)` + border warms; SVG `feTurbulence` grain overlay 2.5% (multiply on cream, screen on dark); 8px grid; content max 1240px; section rhythm `clamp(96px, 12vw, 176px)`.

**7 original SVG illustrations** (Anthropic spirit, original — never traced; 1.5px round-cap ink strokes (cream on terracotta), 24px grid, slight hand-wobble, ≤15 continuous paths each, DrawSVG-ready):
① node-blossom plant — mark/loader/favicon ② head containing a constellation — About ③ hatched shield with watching eye — Scutum ④ hand cradling node-star + olive check — dark-act close ⑤ two hands passing a node-lantern — Community ⑥ winding milestone path — Research spine ⑦ paper plane trailing nodes — Contact.

## 5. Narrative & copy

Through-line: *"I build AI that earns trust, and I bring my community along."* First person, understated-confident, short sentences, never resume-speak. All copy in `content/chapters.ts` as typed data.

- **Ch1 Hero:** `I build AI that *earns* trust.` · Sub: "Zelin (Richard) Zhu — AI safety builder & researcher in Chapel Hill, North Carolina." · Body: "Forty-eight public repositories. One rule that never changes: a human stays in the loop." · Mono meta: `AI SAFETY × COMMUNITY · EN / 中文 · SCROLL ↓`
- **Ch2 About:** `Self-directed, not *self-contained*.` · Body: "I didn't wait for permission to start. I taught myself multivariable calculus and linear algebra from MIT OpenCourseWare, enrolled at Durham Tech and UNC while finishing high school, and learned the rest by shipping — in public, where anyone can check my work." · Stat tiles: 48 repos · 7 Anthropic Academy certs · 4.00 GPA · 60+ attendees · 3-person team · top ~5% of 50,000 — YC Startup School, youngest at 17. · Cards: Education (CHHS '27 Summa Cum Laude, APs, Durham Tech, UNC) + Anthropic Academy (terracotta, node-blossom, 7 certs listed).
- **Ch3 Safety (dark act):** `Show your work.` · Sub: "Agents make moves. I make them leave a record." · Body: "I got interested in AI safety the practical way: I gave agents real capabilities and watched what they tried. Everything I've built since starts from the same premise — autonomy is only useful if you can audit it, replay it, and stop it." · **Scutum** card (live scutum-orpin.vercel.app): "An audit layer for coding agents. Records every execution, risk-scores every tool call, blocks dangerous actions, and routes the rest to a human approval queue. Incidents replay as timelines. There's a prompt-injection demo — try to break it." · **Quantlab** card: "An autonomous research lab built to prove itself wrong. A five-stage agent loop tests trading hypotheses against kill criteria pre-registered in git, a frozen backtest engine, an independent referee model, and a deflated Sharpe. Most hypotheses die. That's the point." · **Al9ha** compact: "The agent layer proposes and a human disposes: paper trading is approval-gated. Nothing executes until I sign off." · Act close: `The last approval is always *human*.`
- **Ch4 Community:** `Bring your people *with* you.` · Sub: "The Triangle raised me on free planetarium shows and open lab doors. I'm paying that back early." · Terracotta cards: **RTP Pathway** ("A Claude-grounded opportunity platform for Triangle-area students. Every listing is verified through a human review queue; natural-language search is answered by Claude, grounded in the verified database with source attribution. Trustworthy answers, on purpose.") · **Durham AI Literacy Workshop** ("I founded our UNA-USA chapter (SDGs 8, 9, 13) and organized AI-literacy programming for 60+ community members — sponsored by Meta and Perplexity.") · **Zhu Academy** compact ("Knowledge-graph adaptive learning pathways — teaching the way I learned."). · Kraft chips: President — AI Club · CS Club · Research & Innovation Club / Boards — Morehead Planetarium Teen Science Café · Museum of Life and Science.
- **Ch5 Research & building:** `Curiosity, *peer-reviewed*.` · Sub: "Research groups, quant teams, a company of my own — and a manuscript on the way." · Institution cards: UNC ACM Lab — Lead Researcher ("I lead a three-person team studying multi-agent AI through a cognitive-science lens. Manuscript in preparation for ICLR 2027.") · UNC PRIMES ("ML and computer-vision research. Invited back to continue.") · MeridianAlgo ("Apex Analysis: an open-source ML stock platform, built with a five-person team.") · Al9ha — Founder ("AI-native quant research: MoE forecasting (TFT, N-BEATS, MAML), regime-aware gating, a multi-LLM agent layer — and the approval gate from Act II."). · Project index rows (hover one-liners): EqualVoice (2–6× ASR error gap for non-native speakers; Duke SCAI finalist — all-high-school team vs grad/PhD teams) · Research Email Agent (Kaggle capstone, Google ADK) · Wharton HSDSC (captain, ensemble modeling) · "+40 more on GitHub →".
- **Ch6 Honors marquee:** USACO GOLD · DUKE SCAI FINALIST 2026 · GT STATS TOP-40 / 1ST-PLACE CAPTAIN · WHARTON HSDSC & INVESTMENT CAPTAIN · YC ~TOP 5% OF 50,000 · SUMMA CUM LAUDE. Label: `HONORS — IN PASSING`.
- **Ch7 Contact:** `Build something *with* me.` · Sub: "Open to research collaborations, internships, and ambitious projects — especially ones that need to be trustworthy." · Magnetic "Say hello" pill (mailto richardrizzling@gmail.com, copy-on-click + olive ✓) · GitHub ZelinZhu-Richard · zelinzhu-richard.github.io · Mono meta: `CHAPEL HILL, NC — HH:MM:SS` live clock · `EN / 中文` · `status: building` + colophon ("Designed & built by me. Next.js, GSAP, react-three-fiber. Set in Schibsted Grotesk & Source Serif 4.").

## 6. Master scroll map & choreography

Total **1400vh** desktop. Background `--bg/--ink` crossfades: cream→ink over **310–410vh** (straddles ch2→3), ink→cream over **760–860vh**; bezel/HUD/constellation flip in lockstep at midpoints.

| # | Chapter | Budget | Range (vh) | Pin | Scrub | Formation |
|---|---|---|---|---|---|---|
| 0 | Loader | timed ~2.4s | — | — | — | nebula pre-staged |
| 1 | Hero | 160vh | 0–160 | ✔ | 1 | Nebula |
| 2 | About | 200vh | 160–360 | ✔ | 0.8 | nebula condenses |
| 3 | Safety | 400vh | 360–760 | ✔ | 1.2 | → Shielded lattice |
| 4 | Community | 220vh | 760–980 | ✔ | 1 | → Community graph |
| 5 | Research | 120 pin + 100 flow | 980–1200 | half | 1 | → Project moons |
| 6 | Honors | 100vh | 1200–1300 | — | — | moons loosen +15% |
| 7 | Contact | 100vh | 1300–1400 | sticky-reveal | — | → Calm field |

**Text-effect rules (anti-effect-soup):** **A** = SplitText char blur-in (`blur 12px→0, y 40→0, opacity`, stagger ~0.03, power3.out, always `clearProps:filter`) — chapter headlines + hero name ONLY · **B** = word-by-word opacity scrub 0.15→1 — pinned body paragraphs, no blur · **C** = `y:24→0 + fade, 0.6s power3.out` — cards/stats/rows/chips · **D** = ScrambleText one-shot — risk chips, stat labels, HUD act names; never scrubbed.

**Per-chapter beats:**
- **Ch0 Loader** (skip via sessionStorage on revisit): 0–0.6s bezel rect DrawSVGs · 0.3–1.1s "ZZ" monogram DrawSVGs (terracotta 2px) · 0.9–1.6s "ZELIN ZHU" chars rise in mask · 1.2–2.0s counter 00→100 ScrambleText, microcopy `drawing the constellation — 47%` · 2.0–2.6s panel exits `clip-path: inset(0 0 100% 0)` expo.inOut, hero blur-in starts at 2.3s (0.3s overlap, no dead frame). Canvas already drifting behind panel.
- **Ch1 Hero:** name at `clamp(96px, 14vw, 220px)` rule A on load; scrubbed: letter-spacing 0→0.06em + y→−8vh parallax; tagline rule B across local 0.15–0.55; name fades last 20%. "Keep Scrolling" ghost text: per-letter blur wave loop (0→6px→0, sine.inOut 2.4s, stagger 0.12, repeat −1) — killed at pin end. Camera dolly z 8→6.
- **Ch2 About:** paragraph rule B local 0–0.5 · stat grid rule C stagger 0.08 local 0.45–0.8, numerals count up 1.2s power1.out snap:1 (own one-shot triggers), labels rule D · cards fade out local 0.9–1.0 into the dark crossfade. Constellation noise amp 0.15→0.04 ("the field holds its breath").
- **Ch3 Safety** (three beats, one pinned layout; left text column swaps; mono audit-log lines tick in margins, e.g. `tool_call: shell.exec — risk: HIGH — BLOCKED`): local 0–0.1 headline rule A + index `03 / SAFETY` · **Beat 1 Scutum 0.08–0.40**: paragraph rule B; LOW/MED/HIGH chips rule D at 0.18/0.22/0.26; at 0.28 a mock tool-call line gets terracotta strikethrough (scaleX 0→1, 0.4s) + BLOCKED chip · **Beat 2 Quantlab 0.40–0.72**: column crossfade; kill-criteria/referee diagram DrawSVGs mapped to scrub 0.44–0.62 · **Beat 3 thesis 0.72–1.0**: closing line rule B; shield outline DrawSVGs around constellation 0.74–0.9. Morph nebula→lattice local 0.05–0.40; lattice holds with 0.02 rad/s idle rotation; camera orbits 30° azimuth, dolly z 6→6.8.
- **Ch4 Community:** background ink→cream local 0–0.45 (constellation colors cross-lerp in shader) · headline rule A at 0.05 · three cards rule C stagger 0.09 local 0.15–0.6 (card copy static — scannable) · morph lattice→graph local 0.1–0.55, lines fade in cluster-by-cluster; camera z 6.8→7.6; hubs pulse ±8% sine 3s.
- **Ch5 Research:** pinned: headline rule A + institutions row rule C stagger 0.06; flow: index rows rule C on enter (`top 85%`, once) · row hover brightens its moon 1.4× + points 1.2× (0.3s) · morph graph→moons across pinned 0–0.6; orbit period ~60s.
- **Ch6 Honors:** two counter-scrolling outline-type marquees, base 40px/s; `timeScale` coupled to scroll velocity /300, clamped ±4, relaxes to 1 at 0.05/frame; hovered item fills terracotta 0.25s; drag-to-scrub with inertia.
- **Ch7 Contact:** terracotta curtain-reveal (footer `position: sticky; bottom: 0`, page lifts off it) · giant "Say hello" magnetic pill · underline DrawSVGs on link hover 0.3s · morph → calm field over 1280–1380vh.

## 7. Constellation engine

**2,400 particles desktop / 900 mobile**; one `THREE.Points` + one `THREE.LineSegments`; single fixed canvas (`inset:0, z-0, pointer-events:none, aria-hidden`) behind DOM.

**GPU morph:** attributes `aStart, aTarget, aStagger, aColorT, aSize`; vertex shader `pos = mix(aStart, aTarget, smoothstep(0., 1., clamp((uProgress − aStagger*0.35)/0.65, 0., 1.)))`. On each handoff: CPU bakes current interpolated positions → `aStart`, writes next formation → `aTarget`, resets `uProgress`; chapter ScrollTriggers drive `uProgress` through `lib/scroll-state.ts`. Colors/sizes lerp in-shader on same progress. **Lines:** per-formation precomputed edge index lists; two line buffers during morphs — outgoing alpha→0 over first 40%, incoming 0→target over last 40% (hides mid-morph spaghetti). `NormalBlending` ink/terracotta on cream; `AdditiveBlending` warm glow on dark; `depthWrite:false`, circular alpha sprite.

**Formation specs (`lib/formations.ts`, same N, indices shuffled per formation so travel paths cross):**
1. **Nebula:** Gaussian ellipsoid σ(3.2, 1.8, 1.2); curl-noise drift amp 0.15 freq 0.4 (uniform `uNoiseAmp`, →0.04 in ch2); 6% terracotta @2.2× size, rest ink 60% alpha; sparse lines: pairs <0.35 among random 10% subset (~180 segs, alpha 0.08); stagger hash(i).
2. **Shielded lattice:** 2,000 pts on rounded-box shell 4.2×2.6×2.6 (corner r 0.5, grid 0.3, jitter 0.04) + 400 pts Gaussian ball r 0.8 inside ("contained agents", 40% alpha, unconnected); grid-adjacent shell lines ~3,600 segs, warm `#E8C4A0` alpha 0.25; 8% corner vertices terracotta glow 2×; stagger hash(i) — chaotic points snap into rows non-uniformly.
3. **Community graph:** 12 cluster centers, golden-angle disc r 3.4, y jitter ±0.4; 150–260 pts/cluster σ 0.35; one hub/cluster 3× terracotta; lines: spokes→hub (alpha 0.12) + k=2 NN <0.3 (0.15) + hub→2-3 nearest hubs (0.4); ~3,000 segs; fade-in waved by cluster id (start `0.3 + i*0.04`); stagger by cluster.
4. **Project moons:** 5 Fibonacci spheres r 0.55, 380 pts each; orbit ellipses r 2.2–3.0, phases i·72°, inclinations ±12°, period 60s; 500 leftover pts faint dust ring r 3.6 alpha 0.2; within-moon NN lines <0.18 capped 350/moon alpha 0.2; no inter-moon lines; `uHighlight[5]` for row hover; stagger by moon.
5. **Calm field:** uniform box 8×3×2, lower two-thirds of frame; y-sine drift amp 0.08 period 6s phase hash(i); size 0.8×; cream 50% alpha on terracotta, 4% ink accents; no lines; stagger hash.

**Camera:** PerspectiveCamera fov 45; per-chapter dolly targets z 8→6→6.8→7.6→7.2→7.2→8, damped in `useFrame` (lerp 0.08, never set directly from scrub) + ±2° pointer parallax (lerped). **GradientBackdrop:** ~40-line simplex-noise 2–3 color gradient `ShaderMaterial` plane in-canvas (the shadergradient look; port preset uniforms if desired).

## 8. HUD & micro-interactions (all v1)

- **HUD** (fixed, above bezel): wordmark "Z—Z" top-left (click → scroll top) · pill nav top-right (About · Safety · Community · Work · Contact; sliding capsule 0.35s power3.out; 4px terracotta active dot via `onToggle`; lenis scrollTo) · mono scroll-% top-far-right, value lerped 0.1/frame, ScrambleTexts to act name for 1.2s at boundaries then back; updates via `ref.textContent` (no React state).
- **Bezel:** fixed 12px inset rounded-rect r 24px, 1px stroke ink 20%; drawn by loader; inverts with theme.
- **Custom cursor:** 8px ink dot (instant) + 28px trailing ring (lerp 0.15); states: link/card → ring 1.6× terracotta stroke · magnetic → dot 0, ring morphs to button bounds · marquee → "→" glyph; normal blend (no `difference`); hidden on touch + reduced-motion.
- **Magnetic CTA:** activation radius 120px; button translates ≤12px toward cursor (`gsap.quickTo` 0.4s power3), label counter-translates 4px; release `elastic.out(1, 0.4)` 0.8s.
- **Cards/rows hover:** y −4px, border ink-10%→terracotta-60%, hand-drawn arrow DrawSVGs in 0.3s; no scale, no shadow.
- **Footer clock:** `CHAPEL HILL, NC — 14:32:05` America/New_York, 1s tick, colon blinks 50% alpha odd seconds; olive "status: building" dot.
- **Selection/focus:** terracotta `::selection`; terracotta-hot focus rings.
- **Easter egg:** 5× wordmark clicks → constellation morphs into a spark/asterisk glyph (points sampled from SVG path) 2.5s with 1-frame dither flicker, eases back; console prints `visitor session risk-scored: LOW — approved by human ✓`.

## 9. Motion system rules

**Eases:** `power3.out` reveals · `expo.inOut` cinematic (loader exit, panel swaps, camera) · `sine.inOut` idle loops · `elastic.out(1,.4)` magnetic release only. **Durations:** micro 0.3s · reveal 0.6s · cinematic 1.0s · loader step 0.8s. **Staggers:** chars 0.03 · words 0.05 (or position-mapped when scrubbed) · rows 0.06 · cards 0.08.

**Blur budget:** CSS filter blur ONLY on (1) hero name intro, (2) "Keep Scrolling" ghost loop (≤14 letters, killed at pin end), (3) chapter-headline one-shots; always `clearProps:"filter"`; never on paragraphs or scrubs >20 elements.

**Hygiene:** scrubbed tweens animate only transform/opacity · `will-change:transform` added on pin enter, removed on leave · SplitText `revert()` after one-shots · background = one CSS var (single paint) · `ScrollTrigger.config({ignoreMobileResize:true})` · all triggers inside one `gsap.context`/`useGSAP` scope for teardown · SplitText runs client-side after `document.fonts.ready`, then `ScrollTrigger.refresh()`.

**Reduced-motion map (`gsap.matchMedia`):** pins → normal flow, stacked · rule A → 0.4s opacity fade · rule B → static full-opacity text · counters → final values · marquee → static wrapped list · constellation → static per-chapter formations, opacity-crossfaded, no drift · loader → 0.6s fade · cursor + magnetic → off · background crossfade kept at 0.4s (color fade is safe).

## 10. Mobile (<768px or coarse pointer)

Hero unpins (100vh, load animation only) · About pin 200→120vh · Safety keeps pin 400→240vh (the core act) · Community + Research unpin to flow · total ≈850vh. Constellation 900 pts, line cap 1,200 segs, DPR ≤1.5, curl noise → precomputed sine sway; camera moves kept. Rule B paragraphs → one-shot staggered fades (scrub on touch feels broken); rule A kept. Cursor/magnetic off; hover → `:active` press. Marquee constant speed. Lenis `syncTouch:false` (native momentum); scrubs ≥1 on touch. Nav collapses to a pill menu button; scroll-% stays.

## 11. Architecture

**Key decisions:** one WebGL canvas — `dynamic(() => import('./Scene'), {ssr:false})` **inside a client component** (App Router rejects ssr:false in server components); DOM chapters scroll above (z-1, transparent) · **`lib/scroll-state.ts` plain mutable module** — ScrollTriggers write `{pageProgress, chapter, chapterProgress, uProgress, blend…}`, R3F reads in `useFrame`; zero React re-renders per frame; zustand only for discrete chapter changes (~4/scroll) · **per-chapter pinned ScrollTriggers**, not one master timeline (independent tuning; clean `gsap.matchMedia` variants) · **Lenis wiring** (`SmoothScroll.tsx`): `ReactLenis root options={{lerp:0.09, autoRaf:false}}`; `lenis.on('scroll', ScrollTrigger.update)`; `gsap.ticker.add(t => lenis.raf(t*1000))`; `lagSmoothing(0)`; native scroll → default `pinType:'fixed'`, never scrollerProxy · all copy in `content/chapters.ts` · real DOM text everywhere; canvas aria-hidden; `webglcontextlost` → unmount canvas, DOM story intact.

**Canvas config:** `dpr [1,1.75]` (≤1.5 mobile), `antialias:false`, `alpha:true`, `powerPreference:'high-performance'`, no shadows/postprocessing.

**File tree (src/):**
```
app/{layout.tsx, page.tsx, globals.css}        # fonts, metadata/OG/JSON-LD, chapter composition, tokens
content/chapters.ts                            # ALL copy as typed data
lib/{scroll-state.ts, scroll-map.ts, formations.ts, theme.ts, motion/tokens.ts}
components/providers/SmoothScroll.tsx
components/canvas/{CanvasRoot,Scene,Constellation,GradientBackdrop}.tsx
components/chapters/{Hero,About,SafetyAct,Community,Research,Honors,ContactFooter}.tsx
components/hud/{ProgressCounter,ChapterNav,Wordmark,Bezel,Loader,Cursor}.tsx
components/illustrations/index.tsx             # 7 motifs + shared stroke-draw hook
components/vendor/                             # react-bits copies (≤2), if used
```

## 12. SEO / meta

Title `Zelin (Richard) Zhu — AI Safety Builder & Researcher`. Description (no age): "AI safety builder and researcher in Chapel Hill, NC — agent audit tooling, Claude-grounded community platforms, and research headed for ICLR." `next/og` static 1200×630 (cream ground, node-blossom mark, tagline "AI that earns trust", terracotta bar). JSON-LD `Person` (sameAs GitHub + github.io, knowsLanguage en/zh). `metadataBase` set; semantic landmarks, one `<h1>`, sections with `aria-label` (`#act-ii` deep links).

## 13. Build order

① Scaffold + git + spec commit + tokens/fonts/grain/bezel in globals + `content/chapters.ts` → ② scroll skeleton: SmoothScroll wiring, scroll-map constants, pins with placeholder sections, background act tweens, HUD counter — **test Safari pinning here** → ③ chapters 1–7 DOM + text effects A–D per §6 → ④ canvas: Scene + GradientBackdrop + nebula only → all 5 formations + morph handoffs wired → ⑤ illustrations (7 SVGs) + DrawSVG moments + loader + honors marquee + footer → ⑥ polish tier: cursor, magnetic, easter egg → ⑦ reduced-motion + mobile matchMedia passes → ⑧ SEO/OG/JSON-LD → ⑨ Vercel deploy.

## 14. Verification

- `pnpm lint && pnpm build` clean (catches ssr:false-in-server-component immediately).
- Dev smoke: pins engage per chapter · HUD hits 100% at bottom · bg crossfades both ways · all 5 morphs fire at boundaries · no three.js console warnings.
- DevTools → emulate `prefers-reduced-motion` → fully readable static page.
- iPhone viewport → shortened pins, native touch feel, 900 particles.
- Lighthouse (prod build): Perf ≥90 desktop / ≥75 mobile · A11y ≥95 · CLS <0.02 · LCP <2.0s desktop (hero text is LCP, never canvas).
- `document.fonts.ready.then(() => ScrollTrigger.refresh())` in place.
- Vercel preview deploy verified (fonts + pin measurements on deployed URL) before done.

## 15. Risks & mitigations

| Risk | Mitigation |
|---|---|
| SplitText × SSR/hydration | Split client-side only after fonts.ready; useGSAP auto-revert |
| Safari pin jank | Test at step ②, before chapters are built |
| Pin jump with smooth scroll | Lenis rides native scroll → default pinType fixed; never scrollerProxy |
| drei v10 vs newest three drift | Minimal drei; pin `three@0.180` if an import breaks |
| Mid-morph line spaghetti | Precomputed edge lists + dual-buffer opacity fade (§7) |
| Font-load pin mis-measurement | fonts.ready → ScrollTrigger.refresh() |
| Low-end mobile GPU | Particle/DPR downshift via matchMedia; context-loss unmount fallback |
| Next 15 on security-maintenance | Pin ^15.5 (patches auto-apply); plan Next 16 codemod later |

## Implementation deviations (recorded post-review)

- **§6 ch6 marquee**: spec called for "drag-to-scrub with inertia"; shipped hover-fill +
  velocity coupling instead (no drag-to-scrub). Not implemented as specified.
- **§6 ch3**: spec called for the camera orbiting 30° azimuth; implemented as the
  lattice group doing an idle spin rather than an actual camera orbit. Visually
  adjacent to the spec'd effect; approved in task review.
- **Responsive — About**: flows naturally on mobile instead of using a 120vh pin (accepted deviation).
- **Responsive — reduced motion**: the constellation snaps between formations rather than
  opacity-crossfading between them under `prefers-reduced-motion` (accepted deviation).

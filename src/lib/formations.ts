/**
 * formations — pure, deterministic geometry generators for the constellation
 * engine (spec §7 "Formation specs"). Each generator bakes the position buffer,
 * per-particle attributes and precomputed edge lists for one of the five
 * formations, for a given particle count N.
 *
 * DELIBERATELY DEPENDENCY-FREE: this module imports nothing (no three, no theme,
 * no scroll-state). It is plain math so that `formations.test.ts` can run under
 * `node --experimental-strip-types --test` with zero new deps, and so the same
 * numbers drive both the GPU morph (Constellation.tsx) and the CPU line mirror.
 *
 * Determinism: every random draw comes from a single seeded mulberry32 stream, so
 * a given N always yields byte-identical buffers. The particle at buffer index `i`
 * is a *different* point in each formation (formations shuffle their own layout),
 * which is what makes the morph paths cross (§7: "indices shuffled per formation").
 */

/** Desktop / mobile particle counts (spec §7: "2,400 particles desktop / 900 mobile"). */
export const PARTICLES = 2400;
export const PARTICLES_MOBILE = 900;

/**
 * Formation indices — MUST match `FORMATION` in scroll-state.ts. Kept as a local
 * plain const (not imported) so this file stays standalone for the node test.
 */
export const F = {
  NEBULA: 0,
  LATTICE: 1,
  GRAPH: 2,
  MOONS: 3,
  CALM: 4,
  /**
   * SPARK — the easter-egg glyph (Task 6, spec §8). NOT part of the scroll sequence
   * (scroll-state's FORMATION enum stops at CALM); it is baked once into the point
   * engine's `aSpark` attribute and blended in on top of the normal morph via a
   * shader uniform, so it never passes through the from→to handoff machine.
   */
  SPARK: 5,
} as const;

/** One moon's baked orbit ellipse (spec §7 formation 4). Runtime orbiting reads these. */
export interface MoonOrbit {
  /** Semi-axis along orbit-plane x (radius 2.2–3.0). */
  a: number;
  /** Semi-axis along orbit-plane z. */
  b: number;
  /** Phase angle at t=0 (i·72°). */
  phase: number;
  /** Orbit-plane inclination (±12°). */
  incl: number;
}

/** Everything one formation needs, sized for N particles / its own edge count. */
export interface FormationData {
  /** Baked positions, length N*3. */
  positions: Float32Array;
  /** Per-particle point size multiplier, length N. */
  size: Float32Array;
  /** Per-particle base alpha 0..1, length N. */
  alpha: Float32Array;
  /** Accent flag, length N: 0 = ink/base, 1 = terracotta (hub / corner glow). */
  accent: Uint8Array;
  /** Per-particle morph stagger 0..1 (hash / cluster / moon per §7), length N. */
  stagger: Float32Array;
  /** Edge index pairs into the particle buffer, length edgeCount*2 (a,b,a,b,…). */
  edges: Uint16Array;
  /** Per-edge base alpha, length edgeCount. */
  edgeAlpha: Float32Array;
  /** Per-edge wave stagger 0..1 (graph cluster wave; 0 when unused), length edgeCount. */
  edgeStagger: Float32Array;
  /** Per-particle moon id 0..4, or -1 (only meaningful for MOONS), length N. */
  moonId: Int8Array;
  /** The 5 moon orbits (MOONS only; empty otherwise). */
  orbits: MoonOrbit[];
}

/* ------------------------------------------------------------------ *
 * Seeded PRNG + helpers
 * ------------------------------------------------------------------ */

const SEED = 0x9e3779b9; // fixed golden-ratio seed → deterministic output

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard-normal sample via Box–Muller (two uniform draws). */
function gaussian(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ≈ 2.399963 rad
const DEG = Math.PI / 180;

/** Scale a desktop-tuned count to N (mobile shrinks everything proportionally). */
function scaled(base: number, n: number): number {
  return Math.max(1, Math.round((base * n) / PARTICLES));
}

/** Allocate a zeroed FormationData shell for N particles (edges filled later). */
function makeData(n: number): FormationData {
  return {
    positions: new Float32Array(n * 3),
    size: new Float32Array(n).fill(1),
    alpha: new Float32Array(n).fill(1),
    accent: new Uint8Array(n),
    stagger: new Float32Array(n),
    edges: new Uint16Array(0),
    edgeAlpha: new Float32Array(0),
    edgeStagger: new Float32Array(0),
    moonId: new Int8Array(n).fill(-1),
    orbits: [],
  };
}

/**
 * Simple edge accumulator with de-duplication and a hard cap. Undirected pairs
 * are keyed by min*maxN + max so (a,b) and (b,a) collapse.
 */
class EdgeList {
  private a: number[] = [];
  private b: number[] = [];
  private al: number[] = [];
  private st: number[] = [];
  private seen = new Set<number>();
  private n: number;
  private cap: number;
  constructor(n: number, cap: number) {
    this.n = n;
    this.cap = cap;
  }
  get length(): number {
    return this.a.length;
  }
  add(i: number, j: number, alpha: number, stagger: number): boolean {
    if (i === j || this.a.length >= this.cap) return false;
    const lo = i < j ? i : j;
    const hi = i < j ? j : i;
    const key = lo * this.n + hi;
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    this.a.push(lo);
    this.b.push(hi);
    this.al.push(alpha);
    this.st.push(stagger);
    return true;
  }
  commit(data: FormationData): void {
    const count = this.a.length;
    const edges = new Uint16Array(count * 2);
    const edgeAlpha = new Float32Array(count);
    const edgeStagger = new Float32Array(count);
    for (let e = 0; e < count; e++) {
      edges[e * 2] = this.a[e];
      edges[e * 2 + 1] = this.b[e];
      edgeAlpha[e] = this.al[e];
      edgeStagger[e] = this.st[e];
    }
    data.edges = edges;
    data.edgeAlpha = edgeAlpha;
    data.edgeStagger = edgeStagger;
  }
}

/** Brute-force k nearest neighbours of point `i` within `members`, distance < maxD. */
function kNearest(
  pos: Float32Array,
  members: number[],
  i: number,
  k: number,
  maxD: number,
): number[] {
  const maxD2 = maxD * maxD;
  const ix = pos[i * 3];
  const iy = pos[i * 3 + 1];
  const iz = pos[i * 3 + 2];
  const cand: Array<{ j: number; d2: number }> = [];
  for (let m = 0; m < members.length; m++) {
    const j = members[m];
    if (j === i) continue;
    const dx = pos[j * 3] - ix;
    const dy = pos[j * 3 + 1] - iy;
    const dz = pos[j * 3 + 2] - iz;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < maxD2) cand.push({ j, d2 });
  }
  cand.sort((p, q) => p.d2 - q.d2);
  const out: number[] = [];
  for (let c = 0; c < cand.length && out.length < k; c++) out.push(cand[c].j);
  return out;
}

/* ------------------------------------------------------------------ *
 * 1. Nebula — Gaussian ellipsoid σ(3.2, 1.8, 1.2)
 * ------------------------------------------------------------------ */

function nebula(n: number, rng: () => number): FormationData {
  const d = makeData(n);
  const SX = 3.2;
  const SY = 1.8;
  const SZ = 1.2;
  for (let i = 0; i < n; i++) {
    // Clamp to ±3σ so bounds stay finite (rare gaussian tails don't fly off).
    d.positions[i * 3] = clamp(gaussian(rng) * SX, -3 * SX, 3 * SX);
    d.positions[i * 3 + 1] = clamp(gaussian(rng) * SY, -3 * SY, 3 * SY);
    d.positions[i * 3 + 2] = clamp(gaussian(rng) * SZ, -3 * SZ, 3 * SZ);
    const terracotta = rng() < 0.06; // 6% terracotta @2.2× (spec §7)
    d.accent[i] = terracotta ? 1 : 0;
    d.size[i] = terracotta ? 2.2 : 1.0;
    d.alpha[i] = terracotta ? 0.9 : 0.6; // rest ink 60% alpha
    d.stagger[i] = rng(); // stagger hash(i)
  }

  // Sparse lines among a random 10% subset (~180 segs, alpha 0.08). §7 says
  // "pairs < 0.35", but at 10% density in a σ(3.2,1.8,1.2) ellipsoid that yields
  // only ~16 pairs; to hit the spec's ~180-segment target we connect each subset
  // point to its 2 nearest subset neighbours within 0.9 and cap at ~180.
  const subset: number[] = [];
  for (let i = 0; i < n; i++) if (rng() < 0.1) subset.push(i);
  const cap = scaled(180, n);
  const edges = new EdgeList(n, cap);
  for (const a of subset) {
    const near = kNearest(d.positions, subset, a, 2, 0.9);
    for (const b of near) edges.add(a, b, 0.08, 0);
  }
  edges.commit(d);
  return d;
}

/* ------------------------------------------------------------------ *
 * 2. Shielded lattice — rounded-box shell + inner "contained" ball
 * ------------------------------------------------------------------ */

const BOX = { hx: 2.1, hy: 1.3, hz: 1.3, r: 0.5 }; // 4.2×2.6×2.6, corner r 0.5

/** Project a box-surface point onto the rounded-box surface (rounds edges/corners). */
function roundBox(x: number, y: number, z: number, out: [number, number, number]): void {
  const qx = clamp(x, -(BOX.hx - BOX.r), BOX.hx - BOX.r);
  const qy = clamp(y, -(BOX.hy - BOX.r), BOX.hy - BOX.r);
  const qz = clamp(z, -(BOX.hz - BOX.r), BOX.hz - BOX.r);
  const dx = x - qx;
  const dy = y - qy;
  const dz = z - qz;
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-6) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
  } else {
    out[0] = qx + (dx / len) * BOX.r;
    out[1] = qy + (dy / len) * BOX.r;
    out[2] = qz + (dz / len) * BOX.r;
  }
}

function lattice(n: number, rng: () => number): FormationData {
  const d = makeData(n);
  const shellCount = scaled(2000, n);
  const innerCount = n - shellCount;

  // The 6 faces of the box, weighted by area; each gets a proportional 2D grid.
  const faces = [
    { axis: 0, sign: 1, u: 1, v: 2, w: 2 * BOX.hy, h: 2 * BOX.hz }, // +X
    { axis: 0, sign: -1, u: 1, v: 2, w: 2 * BOX.hy, h: 2 * BOX.hz }, // -X
    { axis: 1, sign: 1, u: 0, v: 2, w: 2 * BOX.hx, h: 2 * BOX.hz }, // +Y
    { axis: 1, sign: -1, u: 0, v: 2, w: 2 * BOX.hx, h: 2 * BOX.hz }, // -Y
    { axis: 2, sign: 1, u: 0, v: 1, w: 2 * BOX.hx, h: 2 * BOX.hy }, // +Z
    { axis: 2, sign: -1, u: 0, v: 1, w: 2 * BOX.hx, h: 2 * BOX.hy }, // -Z
  ];
  const totalArea = faces.reduce((s, f) => s + f.w * f.h, 0);
  const half = [BOX.hx, BOX.hy, BOX.hz];
  const tmp: [number, number, number] = [0, 0, 0];
  const edges = new EdgeList(n, scaled(4200, n));

  let idx = 0;
  let placed = 0;
  for (let fi = 0; fi < faces.length; fi++) {
    const f = faces[fi];
    // Distribute this face's share of shell points; last face soaks up the remainder.
    const share =
      fi === faces.length - 1
        ? shellCount - placed
        : Math.round((shellCount * f.w * f.h) / totalArea);
    if (share <= 0) continue;
    const cols = Math.max(2, Math.round(Math.sqrt((share * f.w) / f.h)));
    const rows = Math.max(2, Math.round(share / cols));
    const gridStart = idx;
    let made = 0;
    for (let r = 0; r < rows && placed < shellCount; r++) {
      for (let c = 0; c < cols && placed < shellCount; c++) {
        const uu = ((c + 0.5) / cols - 0.5) * f.w + (rng() - 0.5) * 0.04;
        const vv = ((r + 0.5) / rows - 0.5) * f.h + (rng() - 0.5) * 0.04;
        const p: [number, number, number] = [0, 0, 0];
        p[f.axis] = f.sign * half[f.axis];
        p[f.u] = uu;
        p[f.v] = vv;
        roundBox(p[0], p[1], p[2], tmp);
        d.positions[idx * 3] = tmp[0];
        d.positions[idx * 3 + 1] = tmp[1];
        d.positions[idx * 3 + 2] = tmp[2];
        d.alpha[idx] = 0.75;
        d.stagger[idx] = rng(); // stagger hash(i)
        idx++;
        placed++;
        made++;
      }
    }
    // Grid-adjacent edges within this face (right + down neighbours).
    const actualRows = Math.ceil(made / cols);
    for (let r = 0; r < actualRows; r++) {
      for (let c = 0; c < cols; c++) {
        const here = gridStart + r * cols + c;
        if (here >= gridStart + made) continue;
        const right = gridStart + r * cols + (c + 1);
        const down = gridStart + (r + 1) * cols + c;
        if (c + 1 < cols && right < gridStart + made) edges.add(here, right, 0.25, 0);
        if (r + 1 < actualRows && down < gridStart + made) edges.add(here, down, 0.25, 0);
      }
    }
  }

  // 8% corner vertices → terracotta glow 2× (measure "cornerness" = product of
  // normalised |coord|; highest values sit at the 8 rounded corners).
  const cornerness: Array<{ i: number; c: number }> = [];
  for (let i = 0; i < shellCount; i++) {
    const cx = Math.abs(d.positions[i * 3]) / BOX.hx;
    const cy = Math.abs(d.positions[i * 3 + 1]) / BOX.hy;
    const cz = Math.abs(d.positions[i * 3 + 2]) / BOX.hz;
    cornerness.push({ i, c: cx * cy * cz });
  }
  cornerness.sort((p, q) => q.c - p.c);
  const nCorner = Math.round(shellCount * 0.08);
  for (let k = 0; k < nCorner; k++) {
    const i = cornerness[k].i;
    d.accent[i] = 1;
    d.size[i] = 2.0;
    d.alpha[i] = 0.9;
  }

  // 400 inner points — Gaussian ball r 0.8, "contained agents", 40% alpha, unconnected.
  for (let k = 0; k < innerCount; k++) {
    const i = shellCount + k;
    const dir = randDir(rng);
    const rad = Math.cbrt(rng()) * 0.8;
    d.positions[i * 3] = dir[0] * rad;
    d.positions[i * 3 + 1] = dir[1] * rad;
    d.positions[i * 3 + 2] = dir[2] * rad;
    d.alpha[i] = 0.4;
    d.size[i] = 1.0;
    d.stagger[i] = rng();
  }

  edges.commit(d);
  return d;
}

/** Uniform random unit vector. */
function randDir(rng: () => number): [number, number, number] {
  const u = rng() * 2 - 1;
  const t = rng() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return [s * Math.cos(t), s * Math.sin(t), u];
}

/* ------------------------------------------------------------------ *
 * 3. Community graph — 12 golden-angle clusters with hubs
 * ------------------------------------------------------------------ */

function graph(n: number, rng: () => number): FormationData {
  const d = makeData(n);
  const CLUSTERS = 12;
  const DISC_R = 3.4;

  // Cluster centres on a golden-angle disc, y jitter ±0.4.
  const centers: Array<[number, number, number]> = [];
  for (let c = 0; c < CLUSTERS; c++) {
    const rad = DISC_R * Math.sqrt((c + 0.5) / CLUSTERS);
    const ang = c * GOLDEN_ANGLE;
    centers.push([rad * Math.cos(ang), (rng() * 2 - 1) * 0.4, rad * Math.sin(ang)]);
  }

  // Points per cluster: 150–260, then normalise the total to exactly N.
  const raw: number[] = [];
  let sum = 0;
  for (let c = 0; c < CLUSTERS; c++) {
    const v = Math.round(150 + rng() * 110);
    raw.push(v);
    sum += v;
  }
  const counts = raw.map((v) => Math.max(2, Math.round((v / sum) * n)));
  let diff = n - counts.reduce((s, v) => s + v, 0);
  for (let c = 0; diff !== 0; c = (c + 1) % CLUSTERS) {
    if (diff > 0) {
      counts[c]++;
      diff--;
    } else if (counts[c] > 2) {
      counts[c]--;
      diff++;
    }
  }

  const cluster = new Int16Array(n);
  const hubOf = new Int32Array(CLUSTERS);
  const members: number[][] = Array.from({ length: CLUSTERS }, () => []);
  let i = 0;
  for (let c = 0; c < CLUSTERS; c++) {
    for (let p = 0; p < counts[c]; p++) {
      const isHub = p === 0; // one hub per cluster, at the centre
      const cx = centers[c][0];
      const cy = centers[c][1];
      const cz = centers[c][2];
      d.positions[i * 3] = isHub ? cx : cx + gaussian(rng) * 0.35;
      d.positions[i * 3 + 1] = isHub ? cy : cy + gaussian(rng) * 0.35;
      d.positions[i * 3 + 2] = isHub ? cz : cz + gaussian(rng) * 0.35;
      d.accent[i] = isHub ? 1 : 0;
      d.size[i] = isHub ? 3.0 : 1.0; // hub 3× terracotta
      d.alpha[i] = isHub ? 0.95 : 0.7;
      d.stagger[i] = c / CLUSTERS; // stagger by cluster
      cluster[i] = c;
      if (isHub) hubOf[c] = i;
      members[c].push(i);
      i++;
    }
  }

  // Edges (~3000 cap): hub↔hub (bright, first) → spokes → intra-cluster kNN.
  const edges = new EdgeList(n, scaled(3000, n));
  // hub → 2–3 nearest hubs, alpha 0.4
  const hubIdx = Array.from(hubOf);
  for (let c = 0; c < CLUSTERS; c++) {
    const near = kNearest(d.positions, hubIdx, hubOf[c], 3, DISC_R * 2);
    for (const j of near) edges.add(hubOf[c], j, 0.4, c / CLUSTERS);
  }
  // spokes: every non-hub → its cluster hub, alpha 0.12
  for (let c = 0; c < CLUSTERS; c++) {
    for (const m of members[c]) {
      if (m === hubOf[c]) continue;
      edges.add(m, hubOf[c], 0.12, c / CLUSTERS);
    }
  }
  // k=2 NN < 0.3 within cluster, alpha 0.15 — fills the remaining cap (add() is
  // a no-op once the EdgeList is full, so this simply stops contributing there).
  for (let c = 0; c < CLUSTERS; c++) {
    for (const m of members[c]) {
      const near = kNearest(d.positions, members[c], m, 2, 0.3);
      for (const j of near) edges.add(m, j, 0.15, c / CLUSTERS);
    }
  }
  edges.commit(d);
  return d;
}

/* ------------------------------------------------------------------ *
 * 4. Project moons — 5 Fibonacci spheres on inclined orbits + dust ring
 * ------------------------------------------------------------------ */

const MOON_W = (2 * Math.PI) / 60; // period 60s (spec §7)

/** Baked centre of a moon's orbit at time `t` (loosen scales the radius, §6 ch6). */
export function moonCenter(
  o: MoonOrbit,
  t: number,
  loosen: number,
  out: [number, number, number],
): void {
  const theta = o.phase + MOON_W * t;
  const a = o.a * loosen;
  const b = o.b * loosen;
  const ox = a * Math.cos(theta);
  const oz = b * Math.sin(theta);
  out[0] = ox;
  out[1] = -oz * Math.sin(o.incl); // tilt orbit plane about x by inclination
  out[2] = oz * Math.cos(o.incl);
}

function moons(n: number, rng: () => number): FormationData {
  const d = makeData(n);
  const MOONS = 5;
  const moonPts = scaled(380, n);
  const dustPts = n - MOONS * moonPts;
  const R = 0.55;

  const orbits: MoonOrbit[] = [];
  for (let m = 0; m < MOONS; m++) {
    orbits.push({
      a: 2.2 + (m * 0.8) / (MOONS - 1), // radius 2.2–3.0
      b: (2.2 + (m * 0.8) / (MOONS - 1)) * 0.85, // slight ellipse
      phase: m * 72 * DEG, // phases i·72°
      incl: (m % 2 === 0 ? 1 : -1) * 12 * DEG, // inclinations ±12°
    });
  }
  d.orbits = orbits;

  const c0: [number, number, number] = [0, 0, 0];
  const capPerMoon = scaled(350, n);
  const edges = new EdgeList(n, MOONS * capPerMoon); // capped 350/moon
  let i = 0;
  for (let m = 0; m < MOONS; m++) {
    moonCenter(orbits[m], 0, 1, c0); // bake at t=0
    const memb: number[] = [];
    for (let j = 0; j < moonPts; j++) {
      // Fibonacci sphere point.
      const y = 1 - (2 * (j + 0.5)) / moonPts;
      const rr = Math.sqrt(Math.max(0, 1 - y * y));
      const phi = j * GOLDEN_ANGLE;
      d.positions[i * 3] = c0[0] + Math.cos(phi) * rr * R;
      d.positions[i * 3 + 1] = c0[1] + y * R;
      d.positions[i * 3 + 2] = c0[2] + Math.sin(phi) * rr * R;
      d.accent[i] = 0;
      d.size[i] = 1.0;
      d.alpha[i] = 0.8;
      d.stagger[i] = m / MOONS; // stagger by moon
      d.moonId[i] = m;
      memb.push(i);
      i++;
    }
    // Within-moon NN lines < 0.18, capped 350 PER MOON (count this moon's own
    // successful adds — not the running total), alpha 0.2, no inter-moon lines.
    let addedThisMoon = 0;
    for (const p of memb) {
      if (addedThisMoon >= capPerMoon) break;
      const near = kNearest(d.positions, memb, p, 2, 0.18);
      for (const j of near) {
        if (edges.add(p, j, 0.2, 0)) addedThisMoon++;
        if (addedThisMoon >= capPerMoon) break;
      }
    }
  }

  // 500 leftover pts → faint dust ring r 3.6, alpha 0.2 (xz-plane, thin).
  const DUST_R = 3.6;
  for (let k = 0; k < dustPts; k++) {
    const ang = rng() * Math.PI * 2;
    const rad = DUST_R + (rng() - 0.5) * 0.5;
    d.positions[i * 3] = Math.cos(ang) * rad;
    d.positions[i * 3 + 1] = (rng() - 0.5) * 0.4;
    d.positions[i * 3 + 2] = Math.sin(ang) * rad;
    d.accent[i] = 0;
    d.size[i] = 0.8;
    d.alpha[i] = 0.2;
    d.stagger[i] = rng();
    d.moonId[i] = -1;
    i++;
  }

  edges.commit(d);
  return d;
}

/* ------------------------------------------------------------------ *
 * 5. Calm field — uniform box 8×3×2, lower two-thirds
 * ------------------------------------------------------------------ */

function calm(n: number, rng: () => number): FormationData {
  const d = makeData(n);
  for (let i = 0; i < n; i++) {
    d.positions[i * 3] = (rng() - 0.5) * 8; // width 8
    d.positions[i * 3 + 1] = (rng() - 0.5) * 3 - 1.0; // height 3, shifted to lower frame
    d.positions[i * 3 + 2] = (rng() - 0.5) * 2; // depth 2
    // §7: cream 50% alpha, 4% INK accents — the accents are brighter ink points,
    // NOT terracotta, so accent stays 0 (the base colour path) and only alpha lifts.
    const bright = rng() < 0.04;
    d.accent[i] = 0;
    d.size[i] = 0.8; // size 0.8×
    d.alpha[i] = bright ? 0.8 : 0.5; // cream 50% alpha, accents a touch brighter
    d.stagger[i] = rng(); // stagger hash
  }
  // No lines (spec §7 formation 5).
  return d;
}

/* ------------------------------------------------------------------ *
 * 6. Spark — the easter-egg 8-ray asterisk glyph (Task 6 / spec §8)
 * ------------------------------------------------------------------ */

/**
 * An 8-ray asterisk/spark facing the camera (spec §8: "spark/asterisk glyph"). Points
 * are distributed across the 8 rays with a dense core and thinning arms (`rad = R·u^0.55`),
 * a little perpendicular thickness and a shallow z so it reads as a flat glyph. It carries
 * NO edges (like calm) — the glyph is pure points. Pure math + the shared PRNG, so the
 * node test covers it exactly like the five scroll formations.
 */
function spark(n: number, rng: () => number): FormationData {
  const d = makeData(n);
  const RAYS = 8;
  const R = 2.6; // arm reach
  const TWO_PI = Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const ray = i % RAYS;
    const ang = ray * (TWO_PI / RAYS) + (rng() - 0.5) * 0.08; // ray + slight wobble
    const rad = R * Math.pow(rng(), 0.55); // dense core, thinning outward
    const perp = (rng() - 0.5) * 0.1; // arm thickness (perpendicular to the ray)
    const px = Math.cos(ang);
    const py = Math.sin(ang);
    d.positions[i * 3] = px * rad - py * perp;
    d.positions[i * 3 + 1] = py * rad + px * perp;
    d.positions[i * 3 + 2] = (rng() - 0.5) * 0.25; // shallow depth
    const core = rad < 0.5;
    d.accent[i] = rng() < 0.12 ? 1 : 0; // scattered terracotta sparkle
    d.size[i] = core ? 1.6 : 1.0; // brighter, larger core
    d.alpha[i] = core ? 0.95 : 0.8;
    d.stagger[i] = rng(); // stagger hash → dithered form/reform
  }
  // No edges (spec: a glyph, not a graph).
  return d;
}

/* ------------------------------------------------------------------ *
 * Public builder
 * ------------------------------------------------------------------ */

/**
 * Build all five formations for N particles, indexed by `F` / FORMATION value.
 * Each formation draws from its own fresh PRNG stream (same SEED) so a formation's
 * layout is independent of how many formations were built before it.
 */
export function buildFormations(n: number): FormationData[] {
  const out: FormationData[] = [];
  out[F.NEBULA] = nebula(n, mulberry32(SEED + 1));
  out[F.LATTICE] = lattice(n, mulberry32(SEED + 2));
  out[F.GRAPH] = graph(n, mulberry32(SEED + 3));
  out[F.MOONS] = moons(n, mulberry32(SEED + 4));
  out[F.CALM] = calm(n, mulberry32(SEED + 5));
  out[F.SPARK] = spark(n, mulberry32(SEED + 6));
  return out;
}

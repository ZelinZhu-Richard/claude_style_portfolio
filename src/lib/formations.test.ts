/**
 * formations.test.ts — structural + spec-ballpark checks for the constellation
 * geometry generators. Runs with zero new deps under Node 22:
 *
 *   node --experimental-strip-types --test src/lib/formations.test.ts
 *
 * Verifies for EVERY formation at BOTH particle counts (desktop 2400 / mobile 900):
 *   - buffer lengths (positions N*3, per-particle attrs N, edge attrs = edgeCount)
 *   - no NaN / Infinity anywhere
 *   - positions inside the §7 formation bounds
 *   - every edge index is an integer in [0, N) and never a self-loop
 *   - edge counts land in the §7 ballpark, respecting the per-formation caps
 *   - accent ∈ {0,1}, alpha ∈ [0,1], size > 0, stagger ∈ [0,1], moonId ∈ [-1,4]
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildFormations,
  F,
  PARTICLES,
  PARTICLES_MOBILE,
  type FormationData,
} from "./formations.ts";

const NS = [PARTICLES, PARTICLES_MOBILE];

// Per-formation position bounds (absolute), generous enough for jitter/gaussian tails.
const BOUNDS: Record<number, { x: number; y: [number, number]; z: number }> = {
  [F.NEBULA]: { x: 9.7, y: [-5.5, 5.5], z: 3.7 }, // ellipsoid clamped to ±3σ
  [F.LATTICE]: { x: 2.25, y: [-1.55, 1.55], z: 1.55 }, // rounded box + inner ball
  [F.GRAPH]: { x: 6.5, y: [-3, 3], z: 6.5 }, // disc r3.4 + gaussian spread
  [F.MOONS]: { x: 4.5, y: [-2, 2], z: 4.5 }, // orbits ≤3 + spheres + dust ring 3.6
  [F.CALM]: { x: 4.05, y: [-2.55, 0.55], z: 1.05 }, // box 8×3×2, lower two-thirds
  [F.SPARK]: { x: 2.8, y: [-2.8, 2.8], z: 0.3 }, // 8-ray asterisk R≈2.6 + thickness/depth
};

// Expected edge-count ballpark per formation as a fraction of the desktop count,
// so the same bounds scale to mobile. [min, max] on edgeCount at N=2400.
const EDGE_BALLPARK: Record<number, [number, number]> = {
  [F.NEBULA]: [40, 180], // sparse kNN among 10% subset, capped ~180
  [F.LATTICE]: [2000, 4200], // grid-adjacent ~3600, capped 4200
  [F.GRAPH]: [2000, 3000], // spokes+NN+hublinks ~3000, capped 3000
  [F.MOONS]: [400, 1750], // within-moon ≤350/moon → ≤1750
  [F.CALM]: [0, 0], // no lines
  [F.SPARK]: [0, 0], // glyph, no lines
};

const NAMES: Record<number, string> = {
  [F.NEBULA]: "nebula",
  [F.LATTICE]: "lattice",
  [F.GRAPH]: "graph",
  [F.MOONS]: "moons",
  [F.CALM]: "calm",
  [F.SPARK]: "spark",
};

// Every formation index the suite exercises (5 scroll formations + the egg glyph).
const ALL_FORMATIONS = [F.NEBULA, F.LATTICE, F.GRAPH, F.MOONS, F.CALM, F.SPARK];

function finiteArray(a: ArrayLike<number>, label: string): void {
  for (let i = 0; i < a.length; i++) {
    assert.ok(Number.isFinite(a[i]), `${label}[${i}] not finite: ${a[i]}`);
  }
}

function checkFormation(fi: number, n: number, data: FormationData): void {
  const tag = `${NAMES[fi]}@${n}`;

  // ---- buffer lengths ----
  assert.equal(data.positions.length, n * 3, `${tag} positions length`);
  assert.equal(data.size.length, n, `${tag} size length`);
  assert.equal(data.alpha.length, n, `${tag} alpha length`);
  assert.equal(data.accent.length, n, `${tag} accent length`);
  assert.equal(data.stagger.length, n, `${tag} stagger length`);
  assert.equal(data.moonId.length, n, `${tag} moonId length`);
  const edgeCount = data.edges.length / 2;
  assert.ok(Number.isInteger(edgeCount), `${tag} edges length even`);
  assert.equal(data.edgeAlpha.length, edgeCount, `${tag} edgeAlpha length`);
  assert.equal(data.edgeStagger.length, edgeCount, `${tag} edgeStagger length`);

  // ---- finiteness ----
  finiteArray(data.positions, `${tag} positions`);
  finiteArray(data.size, `${tag} size`);
  finiteArray(data.alpha, `${tag} alpha`);
  finiteArray(data.stagger, `${tag} stagger`);
  finiteArray(data.edgeAlpha, `${tag} edgeAlpha`);
  finiteArray(data.edgeStagger, `${tag} edgeStagger`);

  // ---- position bounds ----
  const b = BOUNDS[fi];
  for (let i = 0; i < n; i++) {
    const x = data.positions[i * 3];
    const y = data.positions[i * 3 + 1];
    const z = data.positions[i * 3 + 2];
    assert.ok(Math.abs(x) <= b.x, `${tag} x[${i}]=${x} exceeds ${b.x}`);
    assert.ok(y >= b.y[0] && y <= b.y[1], `${tag} y[${i}]=${y} outside ${b.y}`);
    assert.ok(Math.abs(z) <= b.z, `${tag} z[${i}]=${z} exceeds ${b.z}`);
  }

  // ---- per-particle attribute ranges ----
  for (let i = 0; i < n; i++) {
    assert.ok(data.accent[i] === 0 || data.accent[i] === 1, `${tag} accent[${i}]`);
    assert.ok(data.alpha[i] >= 0 && data.alpha[i] <= 1, `${tag} alpha[${i}]`);
    assert.ok(data.size[i] > 0, `${tag} size[${i}]`);
    assert.ok(data.stagger[i] >= 0 && data.stagger[i] <= 1, `${tag} stagger[${i}]`);
    assert.ok(data.moonId[i] >= -1 && data.moonId[i] <= 4, `${tag} moonId[${i}]`);
  }

  // ---- edge validity ----
  for (let e = 0; e < edgeCount; e++) {
    const a = data.edges[e * 2];
    const c = data.edges[e * 2 + 1];
    assert.ok(Number.isInteger(a) && a >= 0 && a < n, `${tag} edge a=${a}`);
    assert.ok(Number.isInteger(c) && c >= 0 && c < n, `${tag} edge b=${c}`);
    assert.notEqual(a, c, `${tag} self-loop at edge ${e}`);
    assert.ok(data.edgeAlpha[e] >= 0 && data.edgeAlpha[e] <= 1, `${tag} edgeAlpha[${e}]`);
  }

  // ---- edge-count ballpark (scaled to N) ----
  const [lo, hi] = EDGE_BALLPARK[fi];
  const scale = n / PARTICLES;
  const loN = Math.floor(lo * scale);
  const hiN = Math.ceil(hi * scale);
  assert.ok(
    edgeCount >= loN && edgeCount <= hiN,
    `${tag} edgeCount ${edgeCount} outside [${loN}, ${hiN}]`,
  );

  // ---- moon metadata ----
  if (fi === F.MOONS) {
    assert.equal(data.orbits.length, 5, `${tag} orbit count`);
    for (const o of data.orbits) {
      assert.ok(
        Number.isFinite(o.a) && Number.isFinite(o.b) && Number.isFinite(o.phase) && Number.isFinite(o.incl),
        `${tag} orbit params finite`,
      );
      assert.ok(o.a >= 2.2 && o.a <= 3.0, `${tag} orbit radius ${o.a}`);
    }
    let moonPts = 0;
    for (let i = 0; i < n; i++) if (data.moonId[i] >= 0) moonPts++;
    assert.ok(moonPts > 0, `${tag} has moon-tagged points`);
    // Every within-moon edge joins two points of the SAME moon (no inter-moon lines).
    for (let e = 0; e < edgeCount; e++) {
      const a = data.edges[e * 2];
      const c = data.edges[e * 2 + 1];
      assert.ok(data.moonId[a] >= 0, `${tag} edge endpoint ${a} not on a moon`);
      assert.equal(data.moonId[a], data.moonId[c], `${tag} inter-moon edge ${e}`);
    }
  } else {
    assert.equal(data.orbits.length, 0, `${tag} should have no orbits`);
    for (let i = 0; i < n; i++) assert.equal(data.moonId[i], -1, `${tag} moonId[${i}] should be -1`);
  }
}

for (const n of NS) {
  test(`formations build cleanly at N=${n}`, () => {
    const all = buildFormations(n);
    assert.equal(all.length, 6, "six formations (five scroll + spark glyph)");
    for (const fi of ALL_FORMATIONS) {
      checkFormation(fi, n, all[fi]);
    }
  });

  test(`formations are deterministic at N=${n}`, () => {
    // Same seed → byte-identical buffers on every build (the CPU mirror and the
    // node test rely on this determinism).
    const a = buildFormations(n);
    const b = buildFormations(n);
    for (const fi of ALL_FORMATIONS) {
      assert.deepEqual(a[fi].positions, b[fi].positions, `positions differ @${fi}`);
      assert.deepEqual(a[fi].edges, b[fi].edges, `edges differ @${fi}`);
      assert.deepEqual(a[fi].accent, b[fi].accent, `accent differ @${fi}`);
      assert.deepEqual(a[fi].stagger, b[fi].stagger, `stagger differ @${fi}`);
      assert.deepEqual(a[fi].moonId, b[fi].moonId, `moonId differ @${fi}`);
    }
  });
}

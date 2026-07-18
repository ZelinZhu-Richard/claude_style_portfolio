"use client";

/**
 * Constellation — the §7 engine. One THREE.Points (2,400 / 900 particles) that
 * GPU-morphs between five baked formations, plus two LineSegments buffers that
 * crossfade a formation's edges in/out during a morph. Everything is driven from
 * `scroll-state` inside a single `useFrame` with ZERO React state and ZERO
 * per-frame allocation (all scratch buffers are preallocated in `buildEngine`).
 *
 * Design decisions (see task report):
 *  - CPU MIRROR for lines: the shader owns the point morph; the CPU keeps a mirror
 *    of the same `mix(aStart,aTarget)` positions (no drift) so line endpoints can
 *    follow particles without a GPU readback. Lines stream from it each frame.
 *  - MOON ORBIT ON CPU: while MOONS is the target we rewrite `aTarget` for moon
 *    particles from base+orbitΔ each frame. Doing it on the CPU (not a vertex-
 *    shader-only transform) means the mirror — and therefore the within-moon
 *    lines — orbit WITH the moons instead of detaching.
 *  - HANDOFF: on a formation-pair change we bake the current mirror into aStart,
 *    load the target formation into aTarget + per-particle attrs, rebuild both
 *    line buffers, and reset the damped uProgress (snapped to 1 for reduced-motion).
 */

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { buildFormations, moonCenter, F, type FormationData } from "@/lib/formations";
import { scrollState } from "@/lib/scroll-state";
import { palette } from "@/lib/theme";
import { POINT_VERT, POINT_FRAG, LINE_VERT, LINE_FRAG } from "./constellation-shaders";

const DEG = Math.PI / 180;
// Per-chapter dolly targets (§7 "z 8→6→6.8→7.6→7.2→7.2→8"), indexed by
// scrollState.chapter 0..7 — loader (0) shares hero (1).
const CAMERA_Z = [8, 8, 6, 6.8, 7.6, 7.2, 7.2, 8];

/** sRGB hex → linear THREE.Color so the shader output matches the DOM's hex. */
function linColor(hex: string): THREE.Color {
  return new THREE.Color(hex).convertSRGBToLinear();
}
// Point palette (§7): ink on cream, warm paper glow on dark, terracotta accents.
const C_INK = linColor(palette.ink);
const C_GLOW = linColor(palette.paper);
const C_TERRA = linColor(palette.terracotta);

/** Per-formation line colour (cream act / dark act) — lerped by themeBlend. */
function lineColors(f: number): { light: THREE.Color; dark: THREE.Color } {
  switch (f) {
    case F.LATTICE:
      return { light: linColor(palette.latticeLine), dark: linColor(palette.latticeLine) };
    case F.GRAPH:
      return { light: linColor(palette.kraft), dark: linColor(palette.manilla) };
    case F.MOONS:
      return { light: linColor(palette.kraft), dark: linColor(palette.manilla) };
    default: // nebula (calm has no lines)
      return { light: linColor(palette.ink), dark: linColor(palette.manilla) };
  }
}

function smoothstep01(x: number): number {
  return x * x * (3 - 2 * x);
}

interface Engine {
  group: THREE.Group;
  pointsMat: THREE.ShaderMaterial;
  outMat: THREE.ShaderMaterial;
  inMat: THREE.ShaderMaterial;
  formations: FormationData[];
  N: number;
  // point attribute buffers + their attributes
  aStart: Float32Array;
  aTarget: Float32Array;
  aStagger: Float32Array;
  mirror: Float32Array;
  moonBase: Float32Array;
  moonId: Int8Array;
  center0: Array<[number, number, number]>;
  attr: Record<string, THREE.BufferAttribute>;
  // line buffers
  outPos: Float32Array;
  inPos: Float32Array;
  outEA: Float32Array;
  inEA: Float32Array;
  outES: Float32Array;
  inES: Float32Array;
  outGeo: THREE.BufferGeometry;
  inGeo: THREE.BufferGeometry;
  // mutable per-frame state
  s: {
    prevFrom: number;
    prevTo: number;
    progress: number;
    camZ: number;
    px: number;
    py: number;
    loosen: number;
    opacity: number;
    additive: boolean;
    spinRate: number;
    wasDynamic: boolean;
    needLineFlush: boolean;
    outEdges: Uint16Array;
    inEdges: Uint16Array;
    outCount: number;
    inCount: number;
    highlight: number[];
    delta: Float32Array;
    cTmp: [number, number, number];
  };
  dispose: () => void;
}

function buildEngine(N: number, reduced: boolean): Engine {
  const formations = buildFormations(N);
  const init = formations[F.NEBULA]; // scrollState starts at NEBULA→NEBULA

  const aStart = new Float32Array(init.positions);
  const aTarget = new Float32Array(init.positions);
  const mirror = new Float32Array(init.positions);
  const position = new Float32Array(init.positions); // dummy for three (culling off)
  const aStagger = new Float32Array(init.stagger);
  const aColorT = Float32Array.from(init.accent);
  const aSize = new Float32Array(init.size);
  const aAlpha = new Float32Array(init.alpha);
  const aMoon = Float32Array.from(init.moonId);

  const pointGeo = new THREE.BufferGeometry();
  const attr: Record<string, THREE.BufferAttribute> = {
    position: new THREE.BufferAttribute(position, 3),
    aStart: new THREE.BufferAttribute(aStart, 3),
    aTarget: new THREE.BufferAttribute(aTarget, 3),
    aStagger: new THREE.BufferAttribute(aStagger, 1),
    aColorT: new THREE.BufferAttribute(aColorT, 1),
    aSize: new THREE.BufferAttribute(aSize, 1),
    aAlpha: new THREE.BufferAttribute(aAlpha, 1),
    aMoon: new THREE.BufferAttribute(aMoon, 1),
  };
  for (const key in attr) pointGeo.setAttribute(key, attr[key]);

  const pointsMat = new THREE.ShaderMaterial({
    vertexShader: POINT_VERT,
    fragmentShader: POINT_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.NormalBlending,
    uniforms: {
      uProgress: { value: 1 },
      uTime: { value: 0 },
      uNoiseAmp: { value: reduced ? 0 : scrollState.noiseAmp },
      uCalm: { value: 0 },
      uPixelRatio: { value: 1 },
      uSizeScale: { value: 19 },
      uHighlight: { value: [0, 0, 0, 0, 0] },
      uInk: { value: C_INK },
      uGlow: { value: C_GLOW },
      uTerracotta: { value: C_TERRA },
      uThemeBlend: { value: 0 },
      uOpacity: { value: 0 },
    },
  });
  const points = new THREE.Points(pointGeo, pointsMat);
  points.frustumCulled = false;
  points.renderOrder = 2;

  // Two line buffers sized to the largest formation's edge count.
  const maxEdges = Math.max(1, ...formations.map((f) => f.edges.length / 2));
  const outPos = new Float32Array(maxEdges * 6);
  const inPos = new Float32Array(maxEdges * 6);
  const outEA = new Float32Array(maxEdges * 2);
  const inEA = new Float32Array(maxEdges * 2);
  const outES = new Float32Array(maxEdges * 2);
  const inES = new Float32Array(maxEdges * 2);

  const makeLine = (
    pos: Float32Array,
    ea: Float32Array,
    es: Float32Array,
    mode: number,
    order: number,
  ) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aEdgeAlpha", new THREE.BufferAttribute(ea, 1));
    geo.setAttribute("aEdgeStagger", new THREE.BufferAttribute(es, 1));
    geo.setDrawRange(0, 0);
    const mat = new THREE.ShaderMaterial({
      vertexShader: LINE_VERT,
      fragmentShader: LINE_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uMorph: { value: 1 },
        uMode: { value: mode },
        uWave: { value: 0 },
        uOpacity: { value: 0 },
        uColor: { value: linColor(palette.ink) },
        uColorDark: { value: linColor(palette.manilla) },
        uThemeBlend: { value: 0 },
      },
    });
    const line = new THREE.LineSegments(geo, mat);
    line.frustumCulled = false;
    line.renderOrder = order;
    return { geo, mat, line };
  };
  const out = makeLine(outPos, outEA, outES, 0, 0);
  const inc = makeLine(inPos, inEA, inES, 1, 1);

  const group = new THREE.Group();
  group.add(out.line, inc.line, points);

  const orbits = formations[F.MOONS].orbits;
  const center0 = orbits.map((o) => {
    const c: [number, number, number] = [0, 0, 0];
    moonCenter(o, 0, 1, c);
    return c;
  });

  const dispose = () => {
    pointGeo.dispose();
    pointsMat.dispose();
    out.geo.dispose();
    out.mat.dispose();
    inc.geo.dispose();
    inc.mat.dispose();
  };

  return {
    group,
    pointsMat,
    outMat: out.mat,
    inMat: inc.mat,
    formations,
    N,
    aStart,
    aTarget,
    aStagger,
    mirror,
    moonBase: formations[F.MOONS].positions,
    moonId: formations[F.MOONS].moonId,
    center0,
    attr,
    outPos,
    inPos,
    outEA,
    inEA,
    outES,
    inES,
    outGeo: out.geo,
    inGeo: inc.geo,
    s: {
      prevFrom: F.NEBULA,
      prevTo: F.NEBULA,
      progress: 1,
      camZ: 8,
      px: 0,
      py: 0,
      loosen: 1,
      opacity: 0,
      additive: false,
      spinRate: 0,
      wasDynamic: true,
      needLineFlush: true,
      outEdges: init.edges,
      inEdges: init.edges,
      outCount: init.edges.length / 2,
      inCount: init.edges.length / 2,
      highlight: [0, 0, 0, 0, 0],
      delta: new Float32Array(15),
      cTmp: [0, 0, 0],
    },
    dispose,
  };
}

export default function Constellation({ count, reduced }: { count: number; reduced: boolean }) {
  const engine = useMemo(() => buildEngine(count, reduced), [count, reduced]);
  const { gl } = useThree();

  // Initialise the line buffers/uniforms for the mounted NEBULA formation.
  useEffect(() => {
    const e = engine;
    fillEdgeAttrs(e.outEA, e.outES, e.formations[F.NEBULA]);
    fillEdgeAttrs(e.inEA, e.inES, e.formations[F.NEBULA]);
    e.outGeo.setDrawRange(0, e.s.outCount * 2);
    e.inGeo.setDrawRange(0, e.s.inCount * 2);
    e.pointsMat.uniforms.uPixelRatio.value = gl.getPixelRatio();
    return () => engine.dispose();
  }, [engine, gl]);

  useFrame((state, delta) => {
    const e = engine;
    const s = e.s;
    const N = e.N;
    const dt = Math.min(delta, 0.05); // clamp to avoid huge steps after a stall
    const t = state.clock.elapsedTime;
    const from = scrollState.formationFrom;
    const to = scrollState.formationTo;

    // ---------- handoff on formation-pair change ----------
    if (from !== s.prevFrom || to !== s.prevTo) {
      // `s.prevTo` still holds the formation the particles are ACTUALLY at (the
      // mirror we're about to bake into aStart), which is what the outgoing lines
      // must connect. Sourcing outgoing from `from` (the spec predecessor) is only
      // correct on forward, non-skipped transitions; on reverse/skip it would flash
      // a mismatched edge set (e.g. lattice edges over moon-positioned particles).
      const shown = s.prevTo;
      e.aStart.set(e.mirror); // bake current interpolated positions
      e.aTarget.set(e.formations[to].positions);
      e.aStagger.set(e.formations[to].stagger);
      e.attr.aColorT.copyArray(e.formations[to].accent);
      e.attr.aSize.copyArray(e.formations[to].size);
      e.attr.aAlpha.copyArray(e.formations[to].alpha);
      e.attr.aMoon.copyArray(e.formations[to].moonId);
      e.attr.aStart.needsUpdate = true;
      e.attr.aTarget.needsUpdate = true;
      e.attr.aStagger.needsUpdate = true;
      e.attr.aColorT.needsUpdate = true;
      e.attr.aSize.needsUpdate = true;
      e.attr.aAlpha.needsUpdate = true;
      e.attr.aMoon.needsUpdate = true;

      s.outEdges = e.formations[shown].edges;
      s.inEdges = e.formations[to].edges;
      s.outCount = s.outEdges.length / 2;
      s.inCount = s.inEdges.length / 2;
      fillEdgeAttrs(e.outEA, e.outES, e.formations[shown]);
      fillEdgeAttrs(e.inEA, e.inES, e.formations[to]);
      e.outGeo.setDrawRange(0, s.outCount * 2);
      e.inGeo.setDrawRange(0, s.inCount * 2);
      e.outGeo.getAttribute("aEdgeAlpha").needsUpdate = true;
      e.outGeo.getAttribute("aEdgeStagger").needsUpdate = true;
      e.inGeo.getAttribute("aEdgeAlpha").needsUpdate = true;
      e.inGeo.getAttribute("aEdgeStagger").needsUpdate = true;

      const oc = lineColors(shown);
      const ic = lineColors(to);
      e.outMat.uniforms.uColor.value = oc.light;
      e.outMat.uniforms.uColorDark.value = oc.dark;
      e.outMat.uniforms.uWave.value = 0;
      e.inMat.uniforms.uColor.value = ic.light;
      e.inMat.uniforms.uColorDark.value = ic.dark;
      e.inMat.uniforms.uWave.value = to === F.GRAPH ? 1 : 0;

      s.progress = reduced ? 1 : 0;
      s.prevFrom = from;
      s.prevTo = to;
      s.needLineFlush = true;
    }

    // ---------- damped morph progress ----------
    s.progress = reduced
      ? 1
      : THREE.MathUtils.damp(s.progress, scrollState.morph, 6, dt);
    e.pointsMat.uniforms.uProgress.value = s.progress;
    e.outMat.uniforms.uMorph.value = s.progress;
    e.inMat.uniforms.uMorph.value = s.progress;

    // ---------- shared uniforms (drift, theme, time, opacity) ----------
    e.pointsMat.uniforms.uTime.value = t;
    e.pointsMat.uniforms.uNoiseAmp.value = reduced ? 0 : scrollState.noiseAmp;
    e.pointsMat.uniforms.uCalm.value = to === F.CALM ? s.progress : 0;
    e.pointsMat.uniforms.uPixelRatio.value = gl.getPixelRatio();

    const tb = scrollState.themeBlend;
    e.pointsMat.uniforms.uThemeBlend.value = tb;
    e.outMat.uniforms.uThemeBlend.value = tb;
    e.inMat.uniforms.uThemeBlend.value = tb;
    const additive = tb >= 0.5;
    if (additive !== s.additive) {
      s.additive = additive;
      const mode = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
      e.pointsMat.blending = mode;
      e.outMat.blending = mode;
      e.inMat.blending = mode;
    }

    s.opacity = Math.min(1, s.opacity + dt); // ~1s fade-in on mount
    e.pointsMat.uniforms.uOpacity.value = s.opacity;
    e.outMat.uniforms.uOpacity.value = s.opacity;
    e.inMat.uniforms.uOpacity.value = s.opacity;

    // ---------- moon highlight (row hover) ----------
    for (let m = 0; m < 5; m++) {
      const target = !reduced && scrollState.highlightMoon === m ? 1 : 0;
      s.highlight[m] = THREE.MathUtils.damp(s.highlight[m], target, 8, dt);
      (e.pointsMat.uniforms.uHighlight.value as number[])[m] = s.highlight[m];
    }

    // ---------- moon orbit (CPU) while MOONS is the target ----------
    const moonsActive = to === F.MOONS && !reduced;
    if (moonsActive) {
      const loosenTarget = scrollState.chapter === 6 ? 1.15 : 1.0; // §6 honors loosen
      s.loosen = THREE.MathUtils.damp(s.loosen, loosenTarget, 2, dt);
      const orbits = e.formations[F.MOONS].orbits;
      for (let m = 0; m < orbits.length; m++) {
        moonCenter(orbits[m], t, s.loosen, s.cTmp);
        s.delta[m * 3] = s.cTmp[0] - e.center0[m][0];
        s.delta[m * 3 + 1] = s.cTmp[1] - e.center0[m][1];
        s.delta[m * 3 + 2] = s.cTmp[2] - e.center0[m][2];
      }
      const aTarget = e.aTarget;
      const base = e.moonBase;
      const moonId = e.moonId;
      for (let i = 0; i < N; i++) {
        const mm = moonId[i];
        if (mm < 0) continue;
        const i3 = i * 3;
        const d3 = mm * 3;
        aTarget[i3] = base[i3] + s.delta[d3];
        aTarget[i3 + 1] = base[i3 + 1] + s.delta[d3 + 1];
        aTarget[i3 + 2] = base[i3 + 2] + s.delta[d3 + 2];
      }
      e.attr.aTarget.needsUpdate = true;
    }

    // ---------- CPU mirror + line streaming (only while something moves) ----------
    const morphing = Math.abs(s.progress - scrollState.morph) > 1e-3;
    const dynamic = morphing || moonsActive;
    if (dynamic || s.wasDynamic || s.needLineFlush) {
      const aStart = e.aStart;
      const aTarget = e.aTarget;
      const aStagger = e.aStagger;
      const mirror = e.mirror;
      const p = s.progress;
      for (let i = 0; i < N; i++) {
        const m = smoothstep01(clampUnit((p - aStagger[i] * 0.35) / 0.65));
        const i3 = i * 3;
        mirror[i3] = aStart[i3] + (aTarget[i3] - aStart[i3]) * m;
        mirror[i3 + 1] = aStart[i3 + 1] + (aTarget[i3 + 1] - aStart[i3 + 1]) * m;
        mirror[i3 + 2] = aStart[i3 + 2] + (aTarget[i3 + 2] - aStart[i3 + 2]) * m;
      }
      fillLinePositions(e.outPos, e.mirror, s.outEdges, s.outCount);
      fillLinePositions(e.inPos, e.mirror, s.inEdges, s.inCount);
      e.outGeo.getAttribute("position").needsUpdate = true;
      e.inGeo.getAttribute("position").needsUpdate = true;
      s.needLineFlush = false;
    }
    s.wasDynamic = dynamic;

    // ---------- lattice idle rotation (§6 ch3: 0.02 rad/s) ----------
    const latticeActive = reduced
      ? 0
      : to === F.LATTICE
        ? s.progress
        : from === F.LATTICE
          ? 1 - s.progress
          : 0;
    s.spinRate = THREE.MathUtils.damp(s.spinRate, latticeActive * 0.02, 2, dt);
    e.group.rotation.y += s.spinRate * dt;

    // ---------- camera dolly + pointer parallax ----------
    const camZTarget = CAMERA_Z[Math.min(Math.max(scrollState.chapter, 0), 7)];
    s.camZ = reduced ? camZTarget : THREE.MathUtils.damp(s.camZ, camZTarget, 4, dt);
    s.px = reduced ? 0 : THREE.MathUtils.damp(s.px, scrollState.pointer.x, 3, dt);
    s.py = reduced ? 0 : THREE.MathUtils.damp(s.py, scrollState.pointer.y, 3, dt);
    const az = s.px * 2 * DEG;
    const el = -s.py * 2 * DEG;
    state.camera.position.set(Math.sin(az) * s.camZ, Math.sin(el) * s.camZ, Math.cos(az) * s.camZ);
    state.camera.lookAt(0, 0, 0);
  });

  return <primitive object={engine.group} />;
}

/* ---------------- pure per-frame helpers (no allocation) ---------------- */

function clampUnit(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Expand per-edge alpha/stagger into the per-vertex (2 verts/edge) buffers. */
function fillEdgeAttrs(ea: Float32Array, es: Float32Array, f: FormationData): void {
  const count = f.edges.length / 2;
  for (let e = 0; e < count; e++) {
    ea[e * 2] = f.edgeAlpha[e];
    ea[e * 2 + 1] = f.edgeAlpha[e];
    es[e * 2] = f.edgeStagger[e];
    es[e * 2 + 1] = f.edgeStagger[e];
  }
}

/** Stream line endpoint positions from the CPU mirror using the edge index list. */
function fillLinePositions(
  pos: Float32Array,
  mirror: Float32Array,
  edges: Uint16Array,
  count: number,
): void {
  for (let e = 0; e < count; e++) {
    const a = edges[e * 2] * 3;
    const b = edges[e * 2 + 1] * 3;
    const o = e * 6;
    pos[o] = mirror[a];
    pos[o + 1] = mirror[a + 1];
    pos[o + 2] = mirror[a + 2];
    pos[o + 3] = mirror[b];
    pos[o + 4] = mirror[b + 1];
    pos[o + 5] = mirror[b + 2];
  }
}

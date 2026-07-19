"use client";

/**
 * Scene — the single R3F canvas (spec §11 "Canvas config"). Loaded only on the
 * client via `dynamic(ssr:false)` from CanvasRoot, so `window.matchMedia` is safe
 * at mount: it picks the desktop/mobile particle count and DPR cap (§10) and the
 * reduced-motion flag (§9) ONCE, then hands them to the constellation.
 *
 * `onContextLost` bubbles a `webglcontextlost` event up to CanvasRoot, which
 * unmounts the whole layer permanently — the DOM story is self-sufficient.
 */

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PARTICLES, PARTICLES_MOBILE } from "@/lib/formations";
import { isMobile } from "@/lib/interactions";
import GradientBackdrop from "./GradientBackdrop";
import Constellation from "./Constellation";

// §10 mobile constellation line cap (~1,200 segments total). Enforced at buffer build
// (formations.buildFormations edgeCap) so the mobile lattice/graph never exceed it.
const MOBILE_LINE_CAP = 1200;

export default function Scene({ onContextLost }: { onContextLost?: () => void }) {
  // Read the environment once at mount (client-only — this module never SSRs). Detection
  // matches ScrollStory's MOBILE context (coarse pointer OR <768px), fixing the previous
  // width-only check (§10 detection unification).
  const [env] = useState(() => {
    const mobile = isMobile();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return {
      count: mobile ? PARTICLES_MOBILE : PARTICLES,
      dprMax: mobile ? 1.5 : 1.75, // §11: dpr [1,1.75], ≤1.5 mobile
      lineCap: mobile ? MOBILE_LINE_CAP : undefined, // §10 mobile line cap
      mobile,
      reduced,
    };
  });

  return (
    <Canvas
      dpr={[1, env.dprMax]}
      gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}
      camera={{ fov: 45, position: [0, 0, 8] }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener(
          "webglcontextlost",
          () => onContextLost?.(),
          { once: true },
        );
      }}
    >
      <GradientBackdrop />
      <Constellation count={env.count} reduced={env.reduced} mobile={env.mobile} lineCap={env.lineCap} />
    </Canvas>
  );
}

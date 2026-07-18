"use client";

/**
 * GradientBackdrop — a full-viewport plane at far z inside the constellation
 * canvas (spec §7 / §11). A ~2-octave value-noise shader drifts VERY slowly
 * between two near-identical tints of the current background, crossfading cream⇄
 * dark with `scrollState.themeBlend` in lockstep with the DOM `--bg`. Low alpha:
 * it reads as paper mottling over the real DOM background, never a loud gradient,
 * and if the canvas dies the DOM `--bg` is unaffected.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scrollState } from "@/lib/scroll-state";
import { palette } from "@/lib/theme";
import { BACKDROP_VERT, BACKDROP_FRAG } from "./constellation-shaders";

function lin(hex: string): THREE.Color {
  return new THREE.Color(hex).convertSRGBToLinear();
}

export default function GradientBackdrop() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCreamA: { value: lin(palette.paper) },
      uCreamB: { value: lin(palette.paperDeep) },
      uDarkA: { value: lin(palette.ink) },
      uDarkB: { value: lin(palette.slateRaised) },
      uThemeBlend: { value: 0 },
      uAlpha: { value: 0.5 },
    }),
    [],
  );

  useFrame((state) => {
    const m = matRef.current;
    if (!m) return;
    m.uniforms.uTime.value = state.clock.elapsedTime;
    m.uniforms.uThemeBlend.value = scrollState.themeBlend;
  });

  return (
    <mesh position={[0, 0, -12]} frustumCulled={false} renderOrder={-10}>
      <planeGeometry args={[80, 50]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={BACKDROP_VERT}
        fragmentShader={BACKDROP_FRAG}
        transparent
        depthWrite={false}
        depthTest={false}
        uniforms={uniforms}
      />
    </mesh>
  );
}

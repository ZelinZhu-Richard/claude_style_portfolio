/**
 * GLSL for the constellation (spec §7). Factored out of Constellation.tsx so the
 * component stays focused. All three are `ShaderMaterial` (not Raw) shaders, so
 * three injects `position`, `uv`, `projectionMatrix`, `modelViewMatrix` and the
 * float precision header — we declare only our custom attributes/uniforms.
 */

/* ---------------- Points ---------------- */

// GPU morph (§7): pos = mix(aStart, aTarget, smoothstep(clamp((uProgress −
// aStagger*0.35)/0.65))). Plus a cheap "curl-ish" drift (nebula), a calm y-sine
// sway, per-moon highlight scale, and perspective size attenuation.
export const POINT_VERT = /* glsl */ `
attribute vec3 aStart;
attribute vec3 aTarget;
attribute float aStagger;
attribute float aColorT;
attribute float aSize;
attribute float aAlpha;
attribute float aMoon;

uniform float uProgress;
uniform float uTime;
uniform float uNoiseAmp;
uniform float uCalm;
uniform float uPixelRatio;
uniform float uSizeScale;
uniform float uHighlight[5];

varying float vColorT;
varying float vAlpha;
varying float vGlow;

vec3 curlish(vec3 p, float t){
  return vec3(
    sin(p.y * 1.3 + t) - cos(p.z * 1.1 - t),
    sin(p.z * 1.2 + t) - cos(p.x * 1.4 - t),
    sin(p.x * 1.1 + t) - cos(p.y * 1.2 - t)
  );
}

void main() {
  float m = smoothstep(0.0, 1.0, clamp((uProgress - aStagger * 0.35) / 0.65, 0.0, 1.0));
  vec3 pos = mix(aStart, aTarget, m);

  // Nebula curl drift (suppressed in calm) + calm y-sine sway (spec §7 f1/f5).
  pos += curlish(pos * 0.4, uTime * 0.35) * uNoiseAmp * (1.0 - uCalm);
  pos.y += sin(uTime * 1.047 + aStagger * 6.2831) * 0.08 * uCalm;

  float hl = 0.0;
  if (aMoon >= 0.0) {
    int mid = int(aMoon + 0.5);
    for (int k = 0; k < 5; k++) { if (k == mid) hl = uHighlight[k]; }
  }

  vColorT = aColorT;
  vAlpha = aAlpha;
  vGlow = hl;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = aSize * uSizeScale * (1.0 + hl * 0.2) * uPixelRatio / max(-mv.z, 0.1);
  gl_Position = projectionMatrix * mv;
}
`;

// Circular soft sprite; colour lerps ink⇄warm-glow by theme, terracotta override
// where aColorT=1, brightened 1.4× on a highlighted moon.
export const POINT_FRAG = /* glsl */ `
uniform vec3 uInk;
uniform vec3 uGlow;
uniform vec3 uTerracotta;
uniform float uThemeBlend;
uniform float uOpacity;

varying float vColorT;
varying float vAlpha;
varying float vGlow;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.12, length(uv));
  if (a <= 0.001) discard;
  vec3 base = mix(uInk, uGlow, uThemeBlend);
  vec3 col = mix(base, uTerracotta, vColorT) * (1.0 + vGlow * 0.4);
  gl_FragColor = vec4(col, a * vAlpha * uOpacity);
}
`;

/* ---------------- Lines ---------------- */

// Dual-buffer crossfade (§7): outgoing fades 1→0 over morph 0→0.4, incoming
// 0→target over 0.6→1. Graph incoming waves in by cluster stagger. Positions are
// streamed from the CPU mirror each frame (edges reference particle indices).
export const LINE_VERT = /* glsl */ `
attribute float aEdgeAlpha;
attribute float aEdgeStagger;

uniform float uMorph;
uniform float uMode;   // 0 = outgoing, 1 = incoming
uniform float uWave;   // 1 = apply per-cluster wave (graph incoming)
uniform float uOpacity;

varying float vAlpha;

void main() {
  float cf;
  if (uMode < 0.5) {
    cf = 1.0 - smoothstep(0.0, 0.4, uMorph);
  } else {
    float t0 = 0.6 + aEdgeStagger * uWave * 0.3;
    cf = smoothstep(t0, min(t0 + 0.35, 1.0), uMorph);
  }
  vAlpha = aEdgeAlpha * cf * uOpacity;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const LINE_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uColorDark;
uniform float uThemeBlend;

varying float vAlpha;

void main() {
  if (vAlpha <= 0.001) discard;
  gl_FragColor = vec4(mix(uColor, uColorDark, uThemeBlend), vAlpha);
}
`;

/* ---------------- Gradient backdrop ---------------- */

export const BACKDROP_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Very slow 2-octave value-noise drift between two near-identical tints of the
// current background (paper mottling, ≤ a few % deviation). Alpha is low so the
// DOM `--bg` shows through — the backdrop only mottles, never a loud gradient.
export const BACKDROP_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uCreamA;
uniform vec3 uCreamB;
uniform vec3 uDarkA;
uniform vec3 uDarkB;
uniform float uThemeBlend;
uniform float uAlpha;

varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  vec2 p = vUv * 3.0;
  float t = uTime * 0.02;
  float n = vnoise(p + vec2(t, -t * 0.7));
  n = mix(n, vnoise(p * 2.0 - vec2(t * 0.5, t)), 0.5);
  vec3 cream = mix(uCreamA, uCreamB, n);
  vec3 dark = mix(uDarkA, uDarkB, n);
  gl_FragColor = vec4(mix(cream, dark, uThemeBlend), uAlpha);
}
`;

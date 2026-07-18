"use client";

/**
 * CanvasRoot — the client boundary that mounts the WebGL layer BEHIND the DOM
 * story (spec §11). It:
 *   - `dynamic(ssr:false)`-imports Scene (App Router forbids ssr:false in a server
 *     component, and three/R3F must never run at SSR time),
 *   - wraps it in a fixed, `pointer-events:none`, `aria-hidden` layer at z-0 (the
 *     `<main>` story sits at z-10, HUD above), so the canvas never intercepts
 *     scroll/hover nor affects layout — the document height stays 1400vh, and
 *   - permanently UNMOUNTS the canvas on a WebGL context loss or a render error.
 *     The DOM story is self-sufficient, so losing the canvas degrades gracefully
 *     to the plain (CSS-tweened) background.
 */

import dynamic from "next/dynamic";
import { Component, useState, type ReactNode } from "react";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

class CanvasErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function CanvasRoot() {
  const [alive, setAlive] = useState(true);
  if (!alive) return null;

  const kill = () => setAlive(false);
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <CanvasErrorBoundary onError={kill}>
        <Scene onContextLost={kill} />
      </CanvasErrorBoundary>
    </div>
  );
}

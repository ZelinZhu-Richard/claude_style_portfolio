import SmoothScroll from "@/components/providers/SmoothScroll";
import CanvasRoot from "@/components/canvas/CanvasRoot";
import Bezel from "@/components/hud/Bezel";
import Wordmark from "@/components/hud/Wordmark";
import ChapterNav from "@/components/hud/ChapterNav";
import ProgressCounter from "@/components/hud/ProgressCounter";
import ScrollStory from "@/components/ScrollStory";

// Composition only (server component). SmoothScroll owns the Lenis↔GSAP sync;
// CanvasRoot is the WebGL constellation layer at z-0 (behind the z-10 story); the
// fixed HUD (bezel, wordmark, nav, %) layers above both.
export default function Home() {
  return (
    <SmoothScroll>
      <CanvasRoot />
      <Bezel />
      <Wordmark />
      <ChapterNav />
      <ProgressCounter />
      <ScrollStory />
    </SmoothScroll>
  );
}

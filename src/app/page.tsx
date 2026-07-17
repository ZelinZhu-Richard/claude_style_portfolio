import SmoothScroll from "@/components/providers/SmoothScroll";
import Bezel from "@/components/hud/Bezel";
import Wordmark from "@/components/hud/Wordmark";
import ChapterNav from "@/components/hud/ChapterNav";
import ProgressCounter from "@/components/hud/ProgressCounter";
import ScrollStory from "@/components/ScrollStory";

// Composition only (server component). SmoothScroll owns the Lenis↔GSAP sync;
// the fixed HUD (bezel, wordmark, nav, %) layers above the scroll story. Real
// chapter content (Task 3) and the WebGL constellation (Task 4) slot in later.
export default function Home() {
  return (
    <SmoothScroll>
      <Bezel />
      <Wordmark />
      <ChapterNav />
      <ProgressCounter />
      <ScrollStory />
    </SmoothScroll>
  );
}

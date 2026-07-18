/**
 * Placeholder stage for the not-yet-built chapters (Community, Research, Honors,
 * Contact — Task 3b). Renders the same centered kicker + heading the ScrollStory
 * shell used to render inline, so the pin math and layout stay identical while
 * chapters 4–7 wait their turn. Chapters 1–3 replace this with real components.
 */

import type { ChapterDef } from "@/lib/scroll-map";

export default function PlaceholderChapter({ chapter }: { chapter: ChapterDef }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center gap-4 px-8 text-center">
      <p className="label text-xs text-[color:var(--terracotta)]">{chapter.actLabel}</p>
      <h2 className="display text-[color:var(--fg)]">{chapter.label}</h2>
      <p className="label text-xs text-[color:var(--fg)] opacity-50">
        Chapter {chapter.index} placeholder
      </p>
    </div>
  );
}

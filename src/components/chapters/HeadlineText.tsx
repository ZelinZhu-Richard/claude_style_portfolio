/**
 * Renders a `Headline` ({pre, em?, post}) as inline content: the emotive word in
 * Source Serif 4 italic — the site's signature move (spec §4/§5) — flanked by the
 * display-font `pre`/`post` inherited from the parent heading. Emits no wrapper
 * element, so the caller owns the `<h1>`/`<h2>`/`<p>` and its effect target.
 */

import type { Headline } from "@/content/chapters";

export default function HeadlineText({ headline }: { headline: Headline }) {
  const { pre, em, post } = headline;
  return (
    <>
      {pre}
      {em ? (
        <em className="font-[family-name:var(--font-serif)] italic font-normal">{em}</em>
      ) : null}
      {post}
    </>
  );
}

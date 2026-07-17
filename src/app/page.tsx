import { hero } from "@/content/chapters";

// Minimal proof that the content data wires up correctly. Later tasks
// restyle this into the full pinned/scroll-driven hero chapter.
export default function Home() {
  return (
    <main>
      <h1>
        {hero.headline.pre}
        <em>{hero.headline.em}</em>
        {hero.headline.post}
      </h1>
      <p>{hero.sub}</p>
      <p>{hero.body}</p>
    </main>
  );
}

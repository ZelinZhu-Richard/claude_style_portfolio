/**
 * loader-signal — the Loader → Hero handoff (spec §6 Ch0: "hero blur-in starts at
 * 2.3s (0.3s overlap, no dead frame)").
 *
 * The hero name's Rule-A blur-in must NOT play on its own the way every other
 * chapter reveal does; it waits for the loader to hand off. This is the smallest
 * mechanism consistent with `scroll-state.ts`: a plain mutable singleton plus a
 * tiny subscribe. The loader calls `fireLoaderDone()` at loader-exit − 0.3s (and,
 * idempotently, at its hard-timeout / on complete); on a sessionStorage revisit the
 * loader renders nothing and fires it immediately. Hero's `connect` registers with
 * `onLoaderDone` and plays its paused blur-in when it fires — and, because
 * `onLoaderDone` replays to late subscribers, whether Hero connects before OR after
 * the signal, the reveal always runs exactly once.
 *
 * SSR-safe: no window/document access, no side effects at import.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/** `done` flips true the first time the loader hands off; never resets in a session. */
export const loaderSignal = { done: false };

/** Signal that the loader is handing off to the hero. Idempotent. */
export function fireLoaderDone(): void {
  if (loaderSignal.done) return;
  loaderSignal.done = true;
  listeners.forEach((cb) => cb());
  listeners.clear();
}

/**
 * Run `cb` when the loader hands off. If the handoff already happened (revisit
 * skip, or a late-connecting Hero), `cb` runs synchronously now. Returns an
 * unsubscribe (a no-op if it already fired).
 */
export function onLoaderDone(cb: Listener): () => void {
  if (loaderSignal.done) {
    cb();
    return () => {};
  }
  listeners.add(cb);
  return () => listeners.delete(cb);
}

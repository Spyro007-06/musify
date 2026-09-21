import { Brand } from './brand';

/**
 * Full-screen boot splash shown while the session is being resolved.
 *
 * Rendered as a `fixed` overlay on top of the real page rather than in place
 * of it. The session can resolve asynchronously very soon after mount — if
 * this replaced the page tree instead of overlaying it, that fast follow-up
 * update could land while React was still hydrating the initial tree and
 * trip a "hydration mismatch" (the DOM briefly disagreeing with what React
 * expects there). Overlaying keeps the underlying tree's shape stable across
 * that transition; only the overlay's presence toggles.
 */
export function AppSplash() {
  return (
    <div
      role="status"
      aria-label="Loading MUSIFY"
      className="fixed inset-0 z-[100] flex h-dvh w-full items-center justify-center auth-backdrop"
    >
      <Brand size="lg" />
    </div>
  );
}

import { Brand } from './brand';

/** Full-screen boot splash shown while the session is being resolved. */
export function AppSplash() {
  return (
    <div
      role="status"
      aria-label="Loading MUSIFY"
      className="flex h-dvh w-full items-center justify-center auth-backdrop"
    >
      <Brand size="lg" />
    </div>
  );
}

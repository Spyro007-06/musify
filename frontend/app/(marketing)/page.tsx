import Link from 'next/link';

export default function MarketingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-6 text-center text-white">
      <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
        Music for everyone.
      </h1>
      <p className="mt-4 max-w-md text-lg text-neutral-400">
        Millions of tracks, intelligent recommendations, and AI curation.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/home"
          className="rounded-full bg-white px-6 py-3 font-semibold text-black hover:bg-neutral-200"
        >
          Open Web Player
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-neutral-700 px-6 py-3 font-semibold text-white hover:bg-neutral-900"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}

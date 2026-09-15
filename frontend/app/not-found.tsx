import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-black text-white">
      <h2 className="text-4xl font-bold">404</h2>
      <p className="text-neutral-400">Page not found</p>
      <Link
        href="/home"
        className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200"
      >
        Go Home
      </Link>
    </div>
  );
}

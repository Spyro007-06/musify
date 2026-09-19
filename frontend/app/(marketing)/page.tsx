import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Headphones, Radio, Sparkles } from 'lucide-react';
import { Brand } from '@/components/layout/brand';

export default function MarketingPage() {
  return (
    <div className="min-h-dvh bg-canvas text-neutral-50">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-6 sm:px-10">
        <Link href="/" aria-label="Musify home"><Brand /></Link>
        <Link href="/login" className="rounded-full border border-neutral-700 px-5 py-2.5 text-sm font-semibold transition-colors hover:border-brand-400 hover:text-brand-300">Log in <span aria-hidden="true">↗</span></Link>
      </header>
      <main className="mx-auto max-w-7xl px-6 pb-10 sm:px-10">
        <section className="grid items-center gap-10 py-12 sm:py-20 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <div>
            <p className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-300"><span className="h-2 w-2 rounded-full bg-brand-400" /> A world of sound. All yours.</p>
            <h1 className="text-5xl font-bold leading-[1.06] sm:text-7xl lg:text-8xl">Find your<br /><span className="text-brand-400">frequency.</span></h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-neutral-300 sm:text-lg">The tracks you love. The artists you haven&apos;t met yet. A little discovery in every listening session.</p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/home" className="inline-flex items-center gap-3 rounded-full bg-brand-400 px-6 py-3.5 text-sm font-bold text-canvas transition-colors hover:bg-brand-300">Open Web Player <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
              <Link href="/signup" className="rounded-full px-3 py-3.5 text-sm font-semibold text-neutral-200 transition-colors hover:text-brand-300">Create an account</Link>
            </div>
          </div>
          <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl border border-neutral-800 bg-surface" aria-hidden="true">
            <div className="absolute h-[88%] w-[88%] rounded-full border border-brand-400/10" />
            <div className="absolute h-[70%] w-[70%] rounded-full border border-brand-400/15" />
            <Image src="/brand/musify-mark.png" alt="" width={320} height={320} priority className="relative w-3/5 rounded-full" />
            <span className="absolute left-6 top-6 text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">Made for listening</span>
            <span className="absolute bottom-6 left-6 font-display text-lg tracking-tight text-brand-300 sm:text-xl">Less scrolling. More feeling.</span>
          </div>
        </section>
        <section aria-label="Explore Musify" className="grid gap-8 border-t border-neutral-800 pt-8 md:grid-cols-3">
          {[
            { icon: Headphones, title: 'Stay in your groove', text: 'Your favorites, playlists, and recent listens in one place.', href: '/library' },
            { icon: Radio, title: 'Take the scenic route', text: 'Explore new releases, genres, and your next obsession.', href: '/discover' },
            { icon: Sparkles, title: 'Set a mood. Find a mix.', text: 'Turn a feeling into a playlist with your AI music studio.', href: '/ai' },
          ].map(({ icon: Icon, title, text, href }) => (
            <Link key={href} href={href} className="group rounded-lg py-2">
              <Icon className="mb-4 h-5 w-5 text-brand-400" aria-hidden="true" />
              <h2 className="text-lg font-semibold group-hover:text-brand-300">{title}</h2>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-neutral-400">{text}</p>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}

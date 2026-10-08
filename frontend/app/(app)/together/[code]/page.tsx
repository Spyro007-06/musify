'use client';

import * as React from 'react';
import Link from 'next/link';
import { Headphones, ListPlus, Search, Users } from 'lucide-react';
import { joinSession, leaveSession, shareInvite, useTogetherStore } from '@/stores/together-store';
import { TrackRow } from '@/components/music/track-row';

/** Where an invite link lands: listen along in sync, or just add songs to the host's queue. */
export default function TogetherPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = React.use(params);
  const session = useTogetherStore();
  const inThisSession = session.code === code;
  const host = session.hostName ?? 'your friend';

  if (!/^[A-Za-z0-9]{10}$/.test(code)) {
    return <p className="pt-4 text-sm text-neutral-300">This invite link isn&rsquo;t valid. Ask your friend to send it again.</p>;
  }

  if (inThisSession && session.role === 'host') {
    return (
      <Card title="You’re hosting this session" icon={Users}>
        <p className="text-sm text-neutral-400">Friends who open your invite link hear what you play, or add songs to your queue.</p>
        <button type="button" onClick={() => shareInvite(code)} className={primary}>
          Invite friends
        </button>
      </Card>
    );
  }

  if (!inThisSession || session.ended) {
    return (
      <Card title={session.ended ? `${host} ended the session` : 'You’re invited to listen together'} icon={Headphones}>
        {!session.ended && (
          <>
            <p className="text-sm text-neutral-400">
              Hear the same song as your friend, in sync, or just add songs to their queue (great at a party, with one
              speaker).
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => joinSession(code, true)} className={primary}>
                <Headphones className="h-4 w-4" /> Listen along
              </button>
              <button type="button" onClick={() => joinSession(code, false)} className={secondary}>
                <ListPlus className="h-4 w-4" /> Just add songs
              </button>
            </div>
          </>
        )}
        {session.ended && (
          <button type="button" onClick={leaveSession} className={secondary}>
            Close
          </button>
        )}
      </Card>
    );
  }

  return (
    <Card title={session.listenAlong ? `Listening with ${host}` : `Adding songs to ${host}’s queue`} icon={Users}>
      {session.nowPlaying ? (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Playing now</p>
          <TrackRow track={session.nowPlaying} />
        </div>
      ) : (
        <p className="text-sm text-neutral-400">{session.hostHere ? 'Waiting for the next song…' : `Waiting for ${host}…`}</p>
      )}
      <p className="text-sm text-neutral-400">
        Tap &ldquo;Add to queue&rdquo; on any song in Musify and it goes to {host}&rsquo;s queue.
      </p>
      <Link href="/search" className={primary}>
        <Search className="h-4 w-4" /> Find songs to add
      </Link>
    </Card>
  );
}

const primary =
  'inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-brand-400';
const secondary =
  'inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10';

function Card({ title, icon: Icon, children }: { title: string; icon: typeof Users; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl space-y-4 pt-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-400">
          <Icon className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">{title}</h1>
      </div>
      {children}
    </div>
  );
}

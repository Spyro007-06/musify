'use client';

import { Users } from 'lucide-react';
import { leaveSession, setListenAlong, shareInvite, useTogetherStore } from '@/stores/together-store';
import { pluralize } from '@/lib/utils/pluralize';

const buttonClass =
  'shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/10';

/** Shown at the top of every page during a Listen Together session. */
export function TogetherBar() {
  const { code, role, listeners, hostName, hostHere, ended, listenAlong, nowPlaying } = useTogetherStore();
  if (!code || !role) return null;

  const host = hostName ?? 'your friend';
  const text =
    role === 'host'
      ? `Listening together · ${listeners > 0 ? `${pluralize(listeners, 'friend')} joined` : 'invite friends to join'}`
      : ended
        ? `${host} ended the session`
        : !hostHere
          ? `Waiting for ${host} to come back…`
          : listenAlong
            ? `Listening with ${host}`
            : `Adding songs to ${host}'s queue${nowPlaying ? ` · now: ${nowPlaying.title}` : ''}`;

  return (
    <div
      role="status"
      className="sticky top-0 z-20 -mx-4 -mt-4 mb-4 flex items-center gap-3 border-b border-brand-500/20 bg-brand-950/90 px-4 py-2 backdrop-blur md:-mx-6 md:-mt-6"
    >
      <Users className="h-4 w-4 shrink-0 text-brand-400" />
      <p className="min-w-0 flex-1 truncate text-sm text-white">{text}</p>
      {role === 'host' && (
        <button type="button" onClick={() => shareInvite(code)} className={buttonClass}>
          Invite
        </button>
      )}
      {role === 'guest' && !ended && (
        <button type="button" onClick={() => setListenAlong(!listenAlong)} className={buttonClass}>
          {listenAlong ? 'Stop playing here' : 'Play here too'}
        </button>
      )}
      <button type="button" onClick={leaveSession} className={buttonClass}>
        {role === 'host' ? 'End' : ended ? 'Close' : 'Leave'}
      </button>
    </div>
  );
}

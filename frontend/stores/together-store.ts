import { create } from 'zustand';
import { RealtimeChannel, RealtimeClient } from '@supabase/realtime-js';
import { Track } from '@/types/track';
import { setFollowingHost, usePlayerStore } from '@/stores/player-store';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from '@/stores/toast-store';

/**
 * Listen Together. The host's phone broadcasts what it plays over a
 * Supabase Realtime channel; guests who open the invite link either play
 * along in sync or just add songs to the host's queue (a party). Nothing is
 * stored: the channel is the session, named by the random code in the link.
 *
 * ponytail: a public channel, so anyone holding the link can also send
 * events (a guest could fake the host's playback). Fine among friends;
 * Realtime's private channels with RLS if it's ever used beyond that.
 */

// The project's publishable key: made to ship in web pages.
const REALTIME_URL = 'wss://qyvpgwfbzukhmclgcaur.supabase.co/realtime/v1';
const PUBLISHABLE_KEY = 'sb_publishable_a1qBQxbbVzwR8ZET72YZvg_hemGxpaK';
/** The host's playback goes out this often, and at once on any change. */
const HEARTBEAT_MS = 4000;
const SAVED_KEY = 'musify_together';

export interface HostState {
  track: Track | null;
  position: number;
  playing: boolean;
  /** Host clock. ponytail: trusts phones' clocks (network-synced, well under a second apart). */
  sentAt: number;
}

interface TogetherState {
  code: string | null;
  role: 'host' | 'guest' | null;
  /** Guests: this phone plays along in sync (false: party mode, only adding songs). */
  listenAlong: boolean;
  hostName: string | null;
  /** Guests in the session (not counting the host). */
  listeners: number;
  /** Guests: whether the host is connected right now. */
  hostHere: boolean;
  /** Guests: the host ended the session. */
  ended: boolean;
  /** Guests: what's playing at the host's. */
  nowPlaying: Track | null;
}

const idle: TogetherState = {
  code: null,
  role: null,
  listenAlong: false,
  hostName: null,
  listeners: 0,
  hostHere: false,
  ended: false,
  nowPlaying: null,
};

export const useTogetherStore = create<TogetherState>(() => idle);

let client: RealtimeClient | null = null;
let channel: RealtimeChannel | null = null;
let heartbeat: ReturnType<typeof setInterval> | null = null;
let stopWatchingPlayer: (() => void) | null = null;

const myName = () => {
  const user = useAuthStore.getState().user;
  return user?.displayName || user?.username || 'A friend';
};

export const inviteLink = (code: string) => `${window.location.origin}/together/${code}`;

function newCode(): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => chars[b % chars.length]).join('');
}

function save(session: { code: string; role: 'host' | 'guest'; listenAlong: boolean } | null) {
  try {
    if (session) sessionStorage.setItem(SAVED_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SAVED_KEY);
  } catch {
    // Storage blocked: the session just won't survive a reload.
  }
}

function send(event: string, payload: object) {
  return channel?.send({ type: 'broadcast', event, payload });
}

function hostState(): HostState {
  const p = usePlayerStore.getState();
  return { track: p.currentTrack, position: p.currentTime, playing: p.isPlaying, sentAt: Date.now() };
}

function connect(code: string, role: 'host' | 'guest') {
  client = new RealtimeClient(REALTIME_URL, { params: { apikey: PUBLISHABLE_KEY } });
  const ch = client.channel(`together:${code}`, {
    config: { broadcast: { self: false }, presence: { key: crypto.randomUUID() } },
  });
  channel = ch;

  ch.on('presence', { event: 'sync' }, () => {
    const people = Object.values(ch.presenceState()).flat() as unknown as { name: string; role: string }[];
    const host = people.find((p) => p.role === 'host');
    useTogetherStore.setState({
      listeners: people.filter((p) => p.role === 'guest').length,
      hostHere: Boolean(host),
      ...(host ? { hostName: host.name } : {}),
    });
  });

  if (role === 'host') {
    // Someone joined: send them what's playing now, not at the next heartbeat.
    ch.on('presence', { event: 'join' }, () => send('state', hostState()));
    ch.on('broadcast', { event: 'add' }, ({ payload }) => {
      const { track, from } = payload as { track?: Track; from?: string };
      if (!track?.id || !track.title) return;
      usePlayerStore.getState().addToQueue(track);
      toast.success(`${String(from || 'A friend').slice(0, 40)} added "${track.title}"`);
    });
  } else {
    ch.on('broadcast', { event: 'state' }, ({ payload }) => {
      const state = payload as HostState;
      useTogetherStore.setState({ nowPlaying: state.track, ended: false });
      if (useTogetherStore.getState().listenAlong && state.track) {
        usePlayerStore.getState().followHost({ ...state, track: state.track });
      }
    });
    ch.on('broadcast', { event: 'end' }, () => {
      setFollowingHost(false);
      useTogetherStore.setState({ ended: true, hostHere: false });
      save(null);
    });
  }

  ch.subscribe((status) => {
    if (status === 'SUBSCRIBED') ch.track({ name: myName(), role });
  });
}

function host(code: string) {
  connect(code, 'host');
  useTogetherStore.setState({ ...idle, code, role: 'host', hostName: myName() });
  save({ code, role: 'host', listenAlong: false });
  heartbeat = setInterval(() => send('state', hostState()), HEARTBEAT_MS);
  // A new song, play/pause or a seek goes out at once.
  stopWatchingPlayer = usePlayerStore.subscribe((s, prev) => {
    if (
      s.currentTrack?.id !== prev.currentTrack?.id ||
      s.isPlaying !== prev.isPlaying ||
      Math.abs(s.currentTime - prev.currentTime) > 2
    ) {
      send('state', hostState());
    }
  });
}

/** Starts hosting (or returns the session already hosted); the code goes in the invite link. */
export function startSession(): string {
  const { code, role } = useTogetherStore.getState();
  if (code && role === 'host') return code;
  leaveSession();
  const fresh = newCode();
  host(fresh);
  return fresh;
}

export function joinSession(code: string, listenAlong: boolean) {
  if (useTogetherStore.getState().code === code) return setListenAlong(listenAlong);
  leaveSession();
  connect(code, 'guest');
  useTogetherStore.setState({ ...idle, code, role: 'guest', listenAlong });
  setFollowingHost(listenAlong);
  save({ code, role: 'guest', listenAlong });
}

/** Guests: play along on this phone, or only add songs. */
export function setListenAlong(on: boolean) {
  const { code, role } = useTogetherStore.getState();
  if (!code || role !== 'guest') return;
  useTogetherStore.setState({ listenAlong: on });
  setFollowingHost(on);
  if (!on) usePlayerStore.getState().pause();
  save({ code, role, listenAlong: on });
}

/** Ends hosting (guests are told) or leaves as a guest. */
export function leaveSession() {
  const { role } = useTogetherStore.getState();
  const [ch, c] = [channel, client];
  channel = null;
  client = null;
  if (heartbeat) clearInterval(heartbeat);
  heartbeat = null;
  stopWatchingPlayer?.();
  stopWatchingPlayer = null;
  setFollowingHost(false);
  useTogetherStore.setState(idle);
  save(null);
  if (!ch) return;
  const goodbye = role === 'host' ? ch.send({ type: 'broadcast', event: 'end', payload: {} }) : Promise.resolve();
  goodbye.finally(() => c?.disconnect());
}

/** The invite link through the share sheet (WhatsApp…), or copied where there's none. */
export async function shareInvite(code: string) {
  const url = inviteLink(code);
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Listen with me on Musify', text: 'Join me on Musify and hear what I’m playing:', url });
      return;
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return; // closed the share sheet
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.success('Invite link copied. Send it to your friends.');
  } catch {
    toast.info(url);
  }
}

/** A guest's "Add to queue" goes to the host's queue. False when not a guest. */
export function addToHostQueue(track: Track): boolean {
  const { role, hostName, ended } = useTogetherStore.getState();
  if (role !== 'guest' || ended || !channel) return false;
  send('add', { track, from: myName() });
  toast.success(`Added "${track.title}" to ${hostName ? `${hostName}'s` : 'the shared'} queue`);
  return true;
}

if (typeof window !== 'undefined') {
  // Back in the session after a reload (Android often reloads a backgrounded
  // app). Per tab: a second tab must not become a second host of the session.
  try {
    const saved = JSON.parse(sessionStorage.getItem(SAVED_KEY) || 'null');
    if (saved?.role === 'host' && saved.code) host(saved.code);
    else if (saved?.role === 'guest' && saved.code) joinSession(saved.code, Boolean(saved.listenAlong));
  } catch {
    // Nothing usable saved.
  }
  // The name shown to others, once the signed-in user is known.
  useAuthStore.subscribe((s, prev) => {
    const { role } = useTogetherStore.getState();
    if (role && channel && s.user !== prev.user) {
      channel.track({ name: myName(), role });
      if (role === 'host') useTogetherStore.setState({ hostName: myName() });
    }
  });
}

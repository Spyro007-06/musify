import '../tests/setup/saavnMock';
import { saavnMock } from './setup/saavnMock';
import { LyricsService, parseLrc, translateLines } from '@services/lyrics.service';
import { clearMemoryCache } from '@utils/cache';

const track = { id: 't1', title: 'Song - From "Film"', duration: 200, artists: [{ name: 'Composer' }, { name: 'Singer' }], hasLyrics: true };

function mockFetch(routes: Record<string, unknown>) {
  return jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    const hit = Object.entries(routes).find(([prefix]) => url.includes(prefix));
    return hit ? new Response(JSON.stringify(hit[1])) : new Response('not found', { status: 404 });
  });
}

describe('parseLrc', () => {
  it('turns [mm:ss.xx] stamps into seconds and drops unstamped lines', () => {
    expect(parseLrc('[ar: x]\n[00:11.20] First\n[01:02.5]Second\n\nno stamp')).toEqual([
      { time: 11.2, text: 'First' },
      { time: 62.5, text: 'Second' },
    ]);
  });
});

describe('LyricsService.getLyrics', () => {
  beforeEach(() => saavnMock.getTrack.mockResolvedValue(track as any));

  it('prefers synced lyrics from a record by any of our artists within 3s, searching the cleaned title', async () => {
    const fetchSpy = mockFetch({
      'lrclib.net/api/search': [
        { artistName: 'Someone Else', duration: 200, syncedLyrics: '[00:09.00] Wrong artist' },
        { artistName: 'The Singer', duration: 260, syncedLyrics: '[00:09.00] Wrong length' },
        { artistName: 'Singer', duration: 201, plainLyrics: 'Plain only' },
        { artistName: 'Singer, Composer', duration: 202, syncedLyrics: '[00:01.00] Hi' },
      ],
    });
    const lyrics = await LyricsService.getLyrics('t1');
    expect(lyrics).toEqual({ synced: true, instrumental: false, lines: [{ time: 1, text: 'Hi' }] });
    expect(String(fetchSpy.mock.calls[0][0])).toContain('search?track_name=Song');
  });

  it("falls back to the catalog's plain lyrics, then LRCLIB's", async () => {
    mockFetch({ 'lrclib.net/api/search': [{ artistName: 'Singer', duration: 200, plainLyrics: 'From lrclib' }], 'lyrics.getLyrics': { lyrics: 'Line one<br>Line &quot;two&quot;' } });
    expect((await LyricsService.getLyrics('t1')).lines).toEqual([
      { time: null, text: 'Line one' },
      { time: null, text: 'Line "two"' },
    ]);

    jest.restoreAllMocks();
    clearMemoryCache(); // same track again: skip the cached first answer
    saavnMock.getTrack.mockResolvedValue(track as any);
    mockFetch({ 'lrclib.net/api/search': [{ artistName: 'Singer', duration: 200, plainLyrics: 'From lrclib' }] });
    expect(await LyricsService.getLyrics('t1')).toEqual({ synced: false, instrumental: false, lines: [{ time: null, text: 'From lrclib' }] });
  });

  it('retries with title + artists when the title-only search has no match', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (input) =>
      new Response(JSON.stringify(String(input).includes('q=') ? [{ artistName: 'Singer', duration: 199, syncedLyrics: '[00:02.00] Right' }] : []))
    );
    expect((await LyricsService.getLyrics('t1')).lines).toEqual([{ time: 2, text: 'Right' }]);
  });

  it('returns no lines (and flags instrumentals) when nothing has lyrics', async () => {
    mockFetch({ 'lrclib.net/api/search': [{ artistName: 'Singer', duration: 200, instrumental: true }] });
    expect(await LyricsService.getLyrics('t1')).toEqual({ synced: false, instrumental: true, lines: [] });
  });

  it('404s for an unknown track', async () => {
    saavnMock.getTrack.mockResolvedValue(null);
    await expect(LyricsService.getLyrics('nope')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('translateLines', () => {
  const { env } = jest.requireActual('@config/env');
  const gemini = (lines: object[]) =>
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ lines }) }] } }] })));

  beforeEach(() => {
    env.GEMINI_API_KEY = 'test-key';
  });
  afterEach(() => {
    delete env.GEMINI_API_KEY;
    jest.restoreAllMocks();
  });

  it('matches each answer to its line by number, so a skipped line shifts nothing', async () => {
    const fetchSpy = gemini([
      { n: 4, latin: 'tum hi ho', meaning: 'only you' }, // out of order
      { n: 1, latin: 'hum tere bin', meaning: 'without you' },
      // line 2 left out by the model
    ]);

    const out = await translateLines('the song "Tum Hi Ho"', ['हम तेरे बिन', 'अब रह नहीं सकते', '', 'तुम ही हो']);

    expect(out).toEqual([
      { latin: 'hum tere bin', meaning: 'without you' },
      { latin: '', meaning: '' }, // skipped: blank, not the next line's meaning
      { latin: '', meaning: '' }, // an empty line isn't sent at all
      { latin: 'tum hi ho', meaning: 'only you' },
    ]);
    const sent = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string).contents[0].parts[0].text;
    expect(sent).toContain('[{"n":1,"text":"हम तेरे बिन"},{"n":2,"text":"अब रह नहीं सकते"},{"n":4,"text":"तुम ही हो"}]');
  });

  it('answers 503 "busy" when Gemini is overloaded, so the app can offer a retry', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async () => new Response('{"error":{"code":503}}', { status: 503 }));
    await expect(translateLines('a song', ['line'])).rejects.toMatchObject({ statusCode: 503 });
  });
});

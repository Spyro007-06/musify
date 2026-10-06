import {
  isoDurationSec,
  parseApplePlaylist,
  parseJsonLdPlaylist,
  parseYouTubePlaylist,
  parseYouTubeTitle,
  readerFor,
} from '@services/playlistLinks';

const ldScript = (o: object) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;

describe('readerFor', () => {
  it('knows the supported apps by host, https only', () => {
    expect(readerFor(new URL('https://music.youtube.com/playlist?list=PL1')).source).toBe('YouTube');
    expect(readerFor(new URL('https://www.youtube.com/playlist?list=PL1')).source).toBe('YouTube');
    expect(readerFor(new URL('https://music.apple.com/in/playlist/x/pl.1')).source).toBe('Apple Music');
    expect(readerFor(new URL('https://www.jiosaavn.com/featured/x/abc__')).source).toBe('JioSaavn');
    expect(readerFor(new URL('https://link.deezer.com/s/abc')).source).toBe('Deezer');
    expect(readerFor(new URL('https://gaana.com/playlist/x')).source).toBe('Gaana');
  });

  it('refuses other hosts, look-alikes and plain http', () => {
    for (const url of ['https://music.amazon.com/playlists/B1', 'https://youtube.com.evil.example/x', 'https://notgaana.com/x', 'http://gaana.com/playlist/x']) {
      expect(() => readerFor(new URL(url))).toThrow(/can't be read yet/);
    }
  });
});

describe('isoDurationSec', () => {
  it('reads schema.org durations', () => {
    expect(isoDurationSec('PT3M38S')).toBe(218);
    expect(isoDurationSec('PT06M06S')).toBe(366);
    expect(isoDurationSec('PT1H2M3S')).toBe(3723);
    expect(isoDurationSec('3:38')).toBeUndefined();
  });
});

describe('parseJsonLdPlaylist (Gaana and other schema.org pages)', () => {
  it('reads name, songs with first artist and duration, and how many the page left out', () => {
    const html = ldScript({ '@type': 'WebPage' }) + ldScript({
      '@context': 'https://schema.org',
      '@type': 'MusicPlaylist',
      name: 'Hindi Top 50',
      numTracks: 3,
      track: [
        { '@type': 'MusicRecording', name: 'Parvati', byArtist: { '@type': 'Person', name: 'Sadhu Tiwari,Shobhinaw' }, duration: 'PT04M44S' },
        { '@type': 'MusicRecording', name: 'Aaya Sher', byArtist: [{ name: 'Papon' }] },
      ],
    });
    expect(parseJsonLdPlaylist(html)).toEqual({
      title: 'Hindi Top 50',
      coverUrl: null,
      tracks: [
        { title: 'Parvati', artist: 'Sadhu Tiwari', durationSec: 284 },
        { title: 'Aaya Sher', artist: 'Papon', durationSec: undefined },
      ],
      missing: 1,
    });
  });

  it('reads an ItemList of tracks, and finds a playlist inside @graph', () => {
    const html = ldScript({
      '@graph': [{ '@type': 'MusicPlaylist', name: 'G', track: { '@type': 'ItemList', itemListElement: [{ item: { name: 'Song', byArtist: { name: 'A' } } }] } }],
    });
    expect(parseJsonLdPlaylist(html)?.tracks).toEqual([{ title: 'Song', artist: 'A', durationSec: undefined }]);
  });

  it('is null without a MusicPlaylist, and skips a malformed block', () => {
    expect(parseJsonLdPlaylist('<script type="application/ld+json">{oops</script>' + ldScript({ '@type': 'Movie' }))).toBeNull();
  });
});

describe('parseApplePlaylist', () => {
  const ld = ldScript({ '@type': 'MusicPlaylist', name: 'Today’s Hits', numTracks: 3, track: [{ name: 'Solar Eclipse', duration: 'PT3M38S' }] });
  const server = (data: object) => `<script type="application/json" id="serialized-server-data">${JSON.stringify(data)}</script>`;

  it('takes artists from the page data, which JSON-LD lacks there', () => {
    const html =
      ld +
      server({
        data: [{ data: { sections: [{ items: [{ title: 'Today’s Hits', subtitle: 'Apple Music' }] }, { items: [
          { title: 'Solar Eclipse', artistName: 'Drake & Don Toliver', duration: 218389 },
          { title: 'Patient Zero', artistName: 'Taylor Swift', duration: 226000 },
        ] }] } }],
      });
    expect(parseApplePlaylist(html)).toEqual({
      title: 'Today’s Hits',
      coverUrl: null,
      tracks: [
        { title: 'Solar Eclipse', artist: 'Drake', durationSec: 218 },
        { title: 'Patient Zero', artist: 'Taylor Swift', durationSec: 226 },
      ],
      missing: 1,
    });
  });

  it('falls back to JSON-LD when the page data is missing', () => {
    expect(parseApplePlaylist(ld)?.tracks).toEqual([{ title: 'Solar Eclipse', artist: '', durationSec: 218 }]);
  });
});

describe('parseYouTubeTitle', () => {
  it.each([
    ['Shakira, Burna Boy - Dai Dai (Official Video)', 'Dai Dai', 'Shakira'],
    ['KAROL G, Judeline - BbY WOW (Visualizer)', 'BbY WOW', 'KAROL G'],
    ['KALYANI (with Shreya Ghoshal) OFFICIAL MUSIC VIDEO | ARJN | KDS', 'KALYANI (with Shreya Ghoshal)', ''],
    ['Parvati - Full Song | Hanuman Ansh | Sadhu Tiwari', 'Parvati', ''],
    ["KATSEYE (캣츠아이) 'Hootie Frutti' Official MV", 'Hootie Frutti', 'KATSEYE'],
    ['ILLIT (아일릿) ‘It’s Me’ Official MV', 'It’s Me', 'ILLIT'],
    ["Don't Stop Believin'", "Don't Stop Believin'", ''],
    ['Video Games', 'Video Games', ''],
  ])('%s', (raw, title, artist) => {
    expect(parseYouTubeTitle(raw)).toEqual({ title, artist, looseArtist: true });
  });

  it('uses the channel as the artist when the title names none', () => {
    expect(parseYouTubeTitle('Kesariya', 'Arijit Singh - Topic').artist).toBe('Arijit Singh');
  });
});

describe('parseYouTubePlaylist', () => {
  const page = (data: object) => `<script>var ytInitialData = ${JSON.stringify(data)};</script>`;

  it('reads video rows in both the new and the old layout, ignoring non-videos', () => {
    const html = page({
      metadata: { playlistMetadataRenderer: { title: 'Top 100 Songs Global' } },
      contents: { list: [
        { lockupViewModel: { contentType: 'LOCKUP_CONTENT_TYPE_VIDEO', metadata: { lockupMetadataViewModel: { title: { content: 'Shakira - Dai Dai (Official Video)' } } } } },
        { lockupViewModel: { contentType: 'LOCKUP_CONTENT_TYPE_PLAYLIST', metadata: { lockupMetadataViewModel: { title: { content: 'Another playlist' } } } } },
        { playlistVideoRenderer: { title: { runs: [{ text: 'Kesariya' }] }, shortBylineText: { runs: [{ text: 'Sony Music India VEVO' }] } } },
      ] },
    });
    expect(parseYouTubePlaylist(html)).toEqual({
      title: 'Top 100 Songs Global',
      coverUrl: null,
      tracks: [
        { title: 'Dai Dai', artist: 'Shakira', looseArtist: true },
        { title: 'Kesariya', artist: 'Sony Music India', looseArtist: true },
      ],
      missing: 0,
    });
  });

  it('is null for a page without the data', () => {
    expect(parseYouTubePlaylist('<html>consent</html>')).toBeNull();
  });
});

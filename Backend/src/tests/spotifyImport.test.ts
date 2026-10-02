import { cleanTitle, parseSpotifyTrackIds, parseScreenshotSongs } from '@services/spotifyImport.service';

describe('cleanTitle', () => {
  it.each([
    ['Hey Jude - Remastered 2015', 'Hey Jude'],
    ['Here Comes The Sun - 2019 Mix', 'Here Comes The Sun - 2019 Mix'],
    ['Stay (with Justin Bieber)', 'Stay'],
    ['Peaches (feat. Daniel Caesar & Giveon)', 'Peaches'],
    ['Song [feat. X]', 'Song'],
    ['Track (Bonus Track)', 'Track'],
    ['Album Song (Deluxe Edition)', 'Album Song'],
    ['Wonderwall (Remastered 2014)', 'Wonderwall'],
    ['Tum Hi Ho', 'Tum Hi Ho'],
    ['Nicole Kidman', 'Nicole Kidman'],
  ])('%s -> %s', (input, expected) => {
    expect(cleanTitle(input)).toBe(expected);
  });
});

describe('parseSpotifyTrackIds', () => {
  it("pulls every track id out of Spotify's copied links, once each", () => {
    const pasted = [
      'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
      'https://open.spotify.com/intl-de/track/7qiZfU4dY1lWllzX7mPBI3?si=abc',
      'spotify:track:4uLU6hMCjMI75M1A2tKUQC',
      'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    ].join('\n');
    expect(parseSpotifyTrackIds(pasted)).toEqual(['4uLU6hMCjMI75M1A2tKUQC', '7qiZfU4dY1lWllzX7mPBI3']);
  });
});

describe('parseScreenshotSongs', () => {
  it('reads fenced or plain JSON and drops blank rows', () => {
    const text = '```json\n[{"title":" Tum Hi Ho ","artist":"Arijit Singh"},{"title":"","artist":"x"},{"title":"Kesariya"}]\n```';
    expect(parseScreenshotSongs(text)).toEqual([
      { title: 'Tum Hi Ho', artist: 'Arijit Singh' },
      { title: 'Kesariya', artist: '' },
    ]);
  });

  it('keeps only the first artist of a cut-off list', () => {
    expect(parseScreenshotSongs('[{"title":"Anbe Anbe","artist":"Harris Jayaraj, Harish Raghav…"},{"title":"X","artist":"Harish Raghav..."}]')).toEqual([
      { title: 'Anbe Anbe', artist: 'Harris Jayaraj' },
      { title: 'X', artist: 'Harish Raghav' },
    ]);
  });

  it('turns an unreadable reply into a 502, not a crash', () => {
    expect(() => parseScreenshotSongs('not json')).toThrow(/screenshot/);
  });
});

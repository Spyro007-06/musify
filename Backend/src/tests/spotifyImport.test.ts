import { cleanTitle } from '@services/spotifyImport.service';

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

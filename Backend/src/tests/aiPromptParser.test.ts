import { parsePromptIntent } from '@services/ai.service';

describe('parsePromptIntent (rule-based, no LLM)', () => {
  it('genre-only prompt: extracts the genre, nothing else', () => {
    const intent = parsePromptIntent('I want some jazz music');
    expect(intent).toEqual({ genre: 'jazz' });
  });

  it('era-only prompt: maps a 2-digit decade shorthand to a year range', () => {
    const intent = parsePromptIntent('give me 90s hits');
    expect(intent.era).toEqual({ label: '90s', from: 1990, to: 1999 });
    expect(intent.genre).toBeUndefined();
    expect(intent.mood).toBeUndefined();
  });

  it('era-only prompt: maps a 4-digit decade to the same range', () => {
    const intent = parsePromptIntent('1990s throwbacks please');
    expect(intent.era).toEqual({ label: '1990s', from: 1990, to: 1999 });
  });

  it('era shorthand disambiguation: 00s/10s/20s read as 20XX, 30s-90s read as 19XX', () => {
    expect(parsePromptIntent('00s pop').era).toEqual({ label: '00s', from: 2000, to: 2009 });
    expect(parsePromptIntent('10s pop').era).toEqual({ label: '10s', from: 2010, to: 2019 });
    expect(parsePromptIntent('20s pop').era).toEqual({ label: '20s', from: 2020, to: 2029 });
    expect(parsePromptIntent('80s pop').era).toEqual({ label: '80s', from: 1980, to: 1989 });
  });

  it('mood-only prompt: maps a synonym to the energetic/chill taxonomy', () => {
    expect(parsePromptIntent('something upbeat and energetic').mood).toBe('energetic');
    expect(parsePromptIntent('need to relax and chill out').mood).toBe('chill');
  });

  it('artist-name prompt: extracts a "songs like X" candidate and skips genre/mood extraction', () => {
    const intent = parsePromptIntent('songs like Taylor Swift');
    expect(intent.artistCandidate).toBe('taylor swift');
  });

  it('artist-name prompt: also recognizes "similar to X" and "in the style of X"', () => {
    expect(parsePromptIntent('similar to Anirudh Ravichander').artistCandidate).toBe('anirudh ravichander');
    expect(parsePromptIntent('in the style of A.R. Rahman').artistCandidate).toBe('a.r. rahman');
  });

  it('combined prompt: extracts genre, mood, and era together', () => {
    const intent = parsePromptIntent('upbeat pop hits from the 2000s');
    expect(intent.genre).toBe('pop');
    expect(intent.mood).toBe('energetic');
    expect(intent.era).toEqual({ label: '2000s', from: 2000, to: 2009 });
  });

  it('gibberish prompt with no recognizable signal returns an empty intent, not an error', () => {
    expect(parsePromptIntent('asdkjfh qwoeiru zzzzz')).toEqual({});
  });

  it('genre matching prefers the more specific keyword over a shorter one it contains', () => {
    // "pop" is a literal substring of "k-pop"/"kpop" — matching declaration
    // order instead of specificity would silently downgrade these to "pop".
    expect(parsePromptIntent('some k-pop please').genre).toBe('k-pop');
    expect(parsePromptIntent('kpop bangers').genre).toBe('kpop');
    expect(parsePromptIntent('hip hop and rap').genre).toBe('hip hop');
  });
});

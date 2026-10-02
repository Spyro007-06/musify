// Drawn once per app open (page load): the home screen comes out different
// each time the app is opened, but holds still while you move around in it.
const seed = Math.floor(Math.random() * 2 ** 32);

/** Shuffles the same way for the whole session (seeded Fisher–Yates, mulberry32). */
export function sessionShuffle<T>(items: readonly T[]): T[] {
  let s = seed;
  const random = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function unescapeHtml(str: string): string {
  // JioSaavn returns non-string values (arrays/objects) for some fields —
  // e.g. artist.bio — on a truthy-but-not-a-string input this used to throw
  // TypeError: str.replace is not a function, which got reported to users as
  // "Music catalog is temporarily unavailable" (see SaavnService.mapArtist).
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&lsquo;/g, '‘')
    .replace(/&rsquo;/g, '’')
    .replace(/&middot;/g, '·')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

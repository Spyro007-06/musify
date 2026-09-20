// JioSaavn often re-indexes the same song under a second catalog id with a
// "(From "Movie Name")"/"(Original Motion Picture Soundtrack)" suffix and/or
// the artist list in a different order. Strip that suffix and sort the
// artist set before comparing, so "Tum Hi Ho (From "Aashiqui 2")" by
// "Arijit Singh, Mithoon" collides with the same song credited "Mithoon,
// Arijit Singh" — duration is still required to match, so a genuinely
// different version (a remix, a different film's title track) stays distinct.
function normalizeTrackTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*[[(](from\s+"[^"]*"|original\s+motion\s+picture\s+soundtrack)[)\]]\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Dedupes a list of tracks/albums/artists/playlists by id, then by a
 * fuzzy title+artist-set+duration signature to catch the same content
 * re-indexed under a different catalog id. */
export function dedupeById<T extends { id?: string; title?: string; duration?: number; artists?: { name: string }[] } | null>(
  items: T[]
): NonNullable<T>[] {
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();
  return items.filter((item): item is NonNullable<T> => {
    if (!item) return false;
    if (item.id) {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
    }
    const artistSet = (item.artists || [])
      .map((a) => a.name?.toLowerCase().trim())
      .filter(Boolean)
      .sort()
      .join(',');
    const signature = `${normalizeTrackTitle(item.title || '')}|${artistSet}|${item.duration || ''}`;
    if (seenSignatures.has(signature)) return false;
    seenSignatures.add(signature);
    return true;
  });
}

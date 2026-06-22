/**
 * Fetches candidate album art for a track from the public iTunes Search API
 * (no key required). Used only when the user explicitly asks to find artwork.
 */
export type ArtResult = { url: string; title: string; artist: string };

export async function searchArtwork(artist: string, title: string): Promise<ArtResult[]> {
  const cleanedArtist = artist.replace(/unknown artist/gi, '').trim();
  const query = `${cleanedArtist} ${title}`.trim() || title;
  return searchArtworkByQuery(query);
}

/**
 * Searches iTunes with a raw, user-supplied query. Used when the automatic
 * artist+title search returns nothing and the user adds more details
 * (album, year, etc.) to refine the search.
 */
export async function searchArtworkByQuery(query: string): Promise<ArtResult[]> {
  const term = encodeURIComponent(query.trim());
  if (!term) return [];
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=12`);
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: Array<Record<string, unknown>> };
    const seen = new Set<string>();
    const out: ArtResult[] = [];
    for (const r of json.results ?? []) {
      const raw = typeof r.artworkUrl100 === 'string' ? r.artworkUrl100 : undefined;
      if (!raw) continue;
      // iTunes returns 100x100; request a larger version.
      const url = raw.replace('100x100bb', '600x600bb');
      if (seen.has(url)) continue;
      seen.add(url);
      out.push({
        url,
        title: typeof r.trackName === 'string' ? r.trackName : '',
        artist: typeof r.artistName === 'string' ? r.artistName : '',
      });
    }
    return out;
  } catch {
    return [];
  }
}

import type { TasteProfile, Track } from '../../types';
import { rankTracks, trackAffinity } from '../recommender';

function track(p: Partial<Track>): Track {
  return {
    id: p.id ?? 'id',
    uri: p.uri ?? 'file:///x.mp3',
    title: p.title ?? 'Title',
    artist: p.artist ?? 'Artist',
    album: p.album ?? 'Album',
    durationMs: p.durationMs ?? 180000,
    filename: p.filename ?? 'x.mp3',
  };
}

function profile(p: Partial<TasteProfile> = {}): TasteProfile {
  return {
    artist: {},
    album: {},
    token: {},
    liked: {},
    disliked: {},
    plays: {},
    skips: {},
    recent: [],
    updatedAt: 0,
    ...p,
  };
}

describe('trackAffinity', () => {
  it('strongly penalises disliked tracks', () => {
    const t = track({ id: 'a' });
    expect(trackAffinity(t, profile({ disliked: { a: true } }))).toBe(-5);
  });

  it('rewards liked tracks and known artists', () => {
    const t = track({ id: 'a', artist: 'Adele' });
    const aff = trackAffinity(t, profile({ liked: { a: true }, artist: { adele: 2 } }));
    expect(aff).toBeGreaterThan(0);
  });
});

describe('rankTracks', () => {
  const library = [
    track({ id: 'a', artist: 'Adele' }),
    track({ id: 'b', artist: 'Adele' }),
    track({ id: 'c', artist: 'Queen' }),
    track({ id: 'd', artist: 'Metallica' }),
  ];

  it('excludes the seed, excluded ids and disliked tracks', () => {
    const seed = track({ id: 'a', artist: 'Adele' });
    const out = rankTracks(library, profile({ disliked: { d: true } }), {
      seed,
      exclude: new Set(['c']),
      count: 10,
      exploration: 0,
    });
    const ids = out.map((t) => t.id);
    expect(ids).not.toContain('a'); // seed
    expect(ids).not.toContain('c'); // excluded
    expect(ids).not.toContain('d'); // disliked
  });

  it('respects the requested count', () => {
    const out = rankTracks(library, profile(), { count: 2, exploration: 0 });
    expect(out).toHaveLength(2);
  });

  it('enforces the per-artist cap', () => {
    const many = [
      track({ id: 'a1', artist: 'Adele' }),
      track({ id: 'a2', artist: 'Adele' }),
      track({ id: 'a3', artist: 'Adele' }),
      track({ id: 'q1', artist: 'Queen' }),
    ];
    const out = rankTracks(many, profile(), { count: 2, exploration: 0, perArtistCap: 1 });
    const adeleCount = out.filter((t) => t.artist === 'Adele').length;
    expect(adeleCount).toBe(1);
  });

  it('falls back to fill the count for a cold start', () => {
    const out = rankTracks(library, profile(), { count: 4, exploration: 0 });
    expect(out.length).toBe(4);
  });
});

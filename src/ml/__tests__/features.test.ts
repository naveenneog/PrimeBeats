import type { Track } from '../../types';
import { normalizeKey, titleTokens, trackSimilarity } from '../features';

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

describe('normalizeKey', () => {
  it('lowercases and trims', () => {
    expect(normalizeKey('  The Beatles ')).toBe('the beatles');
  });
  it('handles empty input', () => {
    expect(normalizeKey('')).toBe('');
  });
});

describe('titleTokens', () => {
  it('drops stopwords, short words and bracketed content', () => {
    expect(titleTokens('The Scientist (Live)')).toEqual(['scientist']);
  });
  it('keeps meaningful keywords', () => {
    expect(titleTokens('Bohemian Rhapsody')).toEqual(['bohemian', 'rhapsody']);
  });
});

describe('trackSimilarity', () => {
  it('is 1 for the same track id', () => {
    const a = track({ id: 'a' });
    expect(trackSimilarity(a, a)).toBe(1);
  });

  it('rewards a shared artist', () => {
    const a = track({ id: 'a', artist: 'Adele', album: 'X', title: 'Hello' });
    const b = track({ id: 'b', artist: 'Adele', album: 'Y', title: 'Skyfall' });
    expect(trackSimilarity(a, b)).toBeGreaterThanOrEqual(0.55);
  });

  it('scores unrelated tracks lower than same-artist tracks', () => {
    const seed = track({ id: 'a', artist: 'Adele', album: 'X', title: 'Hello' });
    const same = track({ id: 'b', artist: 'Adele', album: 'X', title: 'Hometown' });
    const other = track({ id: 'c', artist: 'Metallica', album: 'Z', title: 'One' });
    expect(trackSimilarity(seed, same)).toBeGreaterThan(trackSimilarity(seed, other));
  });
});

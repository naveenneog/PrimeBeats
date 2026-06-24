import type { Track } from '../../types';
import { matchTrackIndex } from '../search';

function track(p: Partial<Track>): Track {
  return {
    id: p.id ?? 'id',
    uri: 'file:///x.mp3',
    title: p.title ?? 'Title',
    artist: p.artist ?? 'Artist',
    album: p.album ?? 'Album',
    durationMs: 1000,
    filename: 'x.mp3',
  };
}

const library = [
  track({ id: 'a', title: 'Midnight City', artist: 'M83', album: 'Hurry Up' }),
  track({ id: 'b', title: 'Redbone', artist: 'Childish Gambino', album: 'Awaken' }),
  track({ id: 'c', title: 'Instant Crush', artist: 'Daft Punk', album: 'Random Access Memories' }),
];

describe('matchTrackIndex', () => {
  it('matches a full title phrase', () => {
    expect(matchTrackIndex(library, 'Midnight City')).toBe(0);
  });

  it('matches by artist', () => {
    expect(matchTrackIndex(library, 'daft punk')).toBe(2);
  });

  it('matches loose / partial words', () => {
    expect(matchTrackIndex(library, 'play redbone please')).toBe(1);
  });

  it('returns -1 when nothing matches (caller falls back)', () => {
    expect(matchTrackIndex(library, 'nonexistent song zzz')).toBe(-1);
  });

  it('returns -1 for an empty query or empty library', () => {
    expect(matchTrackIndex(library, '   ')).toBe(-1);
    expect(matchTrackIndex([], 'anything')).toBe(-1);
  });

  it('prefers the stronger (full-phrase) match', () => {
    // "crush" appears only in track c; full phrase should win over single words.
    expect(matchTrackIndex(library, 'instant crush')).toBe(2);
  });
});

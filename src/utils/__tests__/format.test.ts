import {
  folderFromUri,
  formatDuration,
  formatSeconds,
  gradientForSeed,
  initialsForName,
  makeId,
  parseTitleArtist,
} from '../format';

describe('formatDuration', () => {
  it('formats minutes and seconds', () => {
    expect(formatDuration(65000)).toBe('1:05');
    expect(formatDuration(5000)).toBe('0:05');
  });

  it('formats hours when long', () => {
    expect(formatDuration(3661000)).toBe('1:01:01');
  });

  it('guards invalid input', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(-10)).toBe('0:00');
    expect(formatDuration(Number.NaN)).toBe('0:00');
  });
});

describe('formatSeconds', () => {
  it('treats the input as seconds', () => {
    expect(formatSeconds(65)).toBe('1:05');
    expect(formatSeconds(0)).toBe('0:00');
  });
});

describe('parseTitleArtist', () => {
  it('splits the "Artist - Title" pattern', () => {
    expect(parseTitleArtist('Adele - Hello.mp3')).toEqual({ title: 'Hello', artist: 'Adele' });
  });

  it('strips a leading track number', () => {
    expect(parseTitleArtist('01 - Adele - Hello.mp3')).toEqual({ title: 'Hello', artist: 'Adele' });
    expect(parseTitleArtist('07. Daft Punk - One More Time.flac')).toEqual({
      title: 'One More Time',
      artist: 'Daft Punk',
    });
  });

  it('falls back to Unknown Artist when there is no separator', () => {
    expect(parseTitleArtist('SomeSong.mp3')).toEqual({
      title: 'SomeSong',
      artist: 'Unknown Artist',
    });
  });
});

describe('folderFromUri', () => {
  it('returns the containing folder', () => {
    expect(folderFromUri('file:///storage/emulated/0/Music/Chill/song.mp3')).toBe('Chill');
  });

  it('ignores generic storage folders', () => {
    expect(folderFromUri('file:///storage/emulated/0/song.mp3')).toBe('Unknown Album');
  });

  it('guards empty input', () => {
    expect(folderFromUri('')).toBe('Unknown Album');
  });
});

describe('initialsForName', () => {
  it('uses two words', () => {
    expect(initialsForName('The Beatles')).toBe('TB');
  });

  it('uses the first two letters of a single word', () => {
    expect(initialsForName('Adele')).toBe('AD');
  });

  it('falls back to a note glyph', () => {
    expect(initialsForName('')).toBe('♪');
  });
});

describe('gradientForSeed', () => {
  it('is deterministic for the same seed', () => {
    expect(gradientForSeed('Chill')).toEqual(gradientForSeed('Chill'));
  });

  it('returns a pair of colors', () => {
    const pair = gradientForSeed('anything');
    expect(pair).toHaveLength(2);
    expect(typeof pair[0]).toBe('string');
  });
});

describe('makeId', () => {
  it('includes the prefix and is unique across calls', () => {
    const a = makeId('trk');
    const b = makeId('trk');
    expect(a.startsWith('trk_')).toBe(true);
    expect(a).not.toBe(b);
  });
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import type { Track } from '../../types';
import { applyMetadataOverride, useMetadataStore } from '../metadataStore';

function track(p: Partial<Track>): Track {
  return {
    id: p.id ?? 'a',
    uri: 'file:///x.mp3',
    title: p.title ?? 'Orig Title',
    artist: p.artist ?? 'Orig Artist',
    album: p.album ?? 'Album',
    durationMs: 1000,
    filename: 'x.mp3',
  };
}

describe('applyMetadataOverride', () => {
  const base = track({});

  it('returns the same track when there is no override', () => {
    expect(applyMetadataOverride(base, undefined)).toBe(base);
    expect(applyMetadataOverride(base, {})).toBe(base);
  });

  it('overrides the title only', () => {
    expect(applyMetadataOverride(base, { title: 'New' })).toMatchObject({
      title: 'New',
      artist: 'Orig Artist',
    });
  });

  it('overrides the artist only', () => {
    expect(applyMetadataOverride(base, { artist: 'New Artist' })).toMatchObject({
      title: 'Orig Title',
      artist: 'New Artist',
    });
  });

  it('overrides both', () => {
    expect(applyMetadataOverride(base, { title: 'T', artist: 'A' })).toMatchObject({
      title: 'T',
      artist: 'A',
    });
  });
});

describe('useMetadataStore', () => {
  beforeEach(() => {
    useMetadataStore.setState({ overrides: {} });
  });

  it('trims and stores an override', () => {
    useMetadataStore.getState().set('a', { title: '  Hi ', artist: ' Bob ' });
    expect(useMetadataStore.getState().overrides.a).toEqual({ title: 'Hi', artist: 'Bob' });
  });

  it('removes the override when both fields become empty', () => {
    useMetadataStore.getState().set('a', { title: 'X' });
    useMetadataStore.getState().set('a', { title: '   ', artist: '' });
    expect(useMetadataStore.getState().overrides.a).toBeUndefined();
  });

  it('clears an override', () => {
    useMetadataStore.getState().set('a', { title: 'X' });
    useMetadataStore.getState().clear('a');
    expect(useMetadataStore.getState().overrides.a).toBeUndefined();
  });
});

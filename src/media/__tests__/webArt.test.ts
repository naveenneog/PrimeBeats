import { searchArtwork, searchArtworkByQuery } from '../webArt';

function mockFetchOnce(payload: unknown, ok = true) {
  (global as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockResolvedValue({
    ok,
    json: async () => payload,
  });
}

describe('searchArtworkByQuery', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns nothing for an empty query without calling the network', () => {
    const fetchMock = jest.fn();
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
    return searchArtworkByQuery('   ').then((res) => {
      expect(res).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it('parses results and upgrades the artwork resolution', async () => {
    mockFetchOnce({
      results: [
        {
          artworkUrl100: 'https://example.com/a/100x100bb.jpg',
          trackName: 'Hello',
          artistName: 'Adele',
        },
      ],
    });
    const res = await searchArtworkByQuery('adele hello');
    expect(res).toHaveLength(1);
    expect(res[0].url).toBe('https://example.com/a/600x600bb.jpg');
    expect(res[0]).toMatchObject({ title: 'Hello', artist: 'Adele' });
  });

  it('de-duplicates identical artwork urls', async () => {
    mockFetchOnce({
      results: [
        { artworkUrl100: 'https://x/100x100bb.jpg', trackName: 'A', artistName: 'X' },
        { artworkUrl100: 'https://x/100x100bb.jpg', trackName: 'A (Live)', artistName: 'X' },
      ],
    });
    const res = await searchArtworkByQuery('x a');
    expect(res).toHaveLength(1);
  });

  it('returns [] on a non-ok response', async () => {
    mockFetchOnce({}, false);
    expect(await searchArtworkByQuery('whatever')).toEqual([]);
  });

  it('returns [] when fetch throws', async () => {
    (global as unknown as { fetch: jest.Mock }).fetch = jest
      .fn()
      .mockRejectedValue(new Error('offline'));
    expect(await searchArtworkByQuery('whatever')).toEqual([]);
  });
});

describe('searchArtwork', () => {
  afterEach(() => jest.resetAllMocks());

  it('strips "Unknown Artist" from the query it builds', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
    await searchArtwork('Unknown Artist', 'Mystery Song');
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain(encodeURIComponent('Mystery Song'));
    expect(calledUrl.toLowerCase()).not.toContain('unknown');
  });
});

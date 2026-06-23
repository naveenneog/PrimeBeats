import { SEEK_PIN_WIDTH, progressiveSeekStep, seekPinLeft } from '../seek';

const WIDTH = 300;

describe('seekPinLeft', () => {
  it('returns 0 when the layout is unknown', () => {
    expect(seekPinLeft(50, 100, 0)).toBe(0);
  });

  it('returns 0 when the duration is unknown', () => {
    expect(seekPinLeft(50, 0, WIDTH)).toBe(0);
  });

  it('clamps to the left edge at the start', () => {
    expect(seekPinLeft(0, 100, WIDTH)).toBe(0);
  });

  it('clamps to the right edge at the end', () => {
    expect(seekPinLeft(100, 100, WIDTH)).toBe(WIDTH - SEEK_PIN_WIDTH);
  });

  it('centres the pin near the middle of the track', () => {
    const left = seekPinLeft(50, 100, WIDTH);
    const center = left + SEEK_PIN_WIDTH / 2;
    // Thumb centre at the midpoint should be ~150px; allow for thumb-radius math.
    expect(Math.abs(center - WIDTH / 2)).toBeLessThan(2);
  });

  it('never lets the pin overflow the track', () => {
    for (let v = 0; v <= 100; v += 10) {
      const left = seekPinLeft(v, 100, WIDTH);
      expect(left).toBeGreaterThanOrEqual(0);
      expect(left).toBeLessThanOrEqual(WIDTH - SEEK_PIN_WIDTH);
    }
  });
});

describe('progressiveSeekStep', () => {
  it('follows the 2,2,3,4,5 progression', () => {
    expect([1, 2, 3, 4, 5, 6].map(progressiveSeekStep)).toEqual([2, 2, 3, 4, 5, 6]);
  });

  it('produces cumulative jumps of +2,+2,+3,+4,+5', () => {
    let total = 0;
    const cumulative = [1, 2, 3, 4, 5].map((n) => (total += progressiveSeekStep(n)));
    expect(cumulative).toEqual([2, 4, 7, 11, 16]);
  });

  it('guards a non-positive tap index', () => {
    expect(progressiveSeekStep(0)).toBe(0);
    expect(progressiveSeekStep(-3)).toBe(0);
  });
});

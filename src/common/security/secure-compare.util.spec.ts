import { secureCompare } from './secure-compare.util';

describe('secureCompare', () => {
  it('returns true for identical strings', () => {
    expect(secureCompare('super-secret', 'super-secret')).toBe(true);
  });

  it('returns false for different strings of the same length', () => {
    expect(secureCompare('super-secret', 'super-secreX')).toBe(false);
  });

  it('returns false for strings of different lengths', () => {
    expect(secureCompare('short', 'a-much-longer-secret')).toBe(false);
  });

  it('returns false when comparing against an empty string', () => {
    expect(secureCompare('', 'nonempty')).toBe(false);
    expect(secureCompare('nonempty', '')).toBe(false);
  });

  it('treats two empty strings as equal', () => {
    expect(secureCompare('', '')).toBe(true);
  });
});

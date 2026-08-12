import { sanitizeString, sanitizeStringArray } from './sanitize.transform';

function transform(fn: typeof sanitizeString, value: unknown) {
  return fn({ value } as never);
}

describe('sanitizeString', () => {
  it('trims leading and trailing whitespace', () => {
    expect(transform(sanitizeString, '  Bolo de Cenoura  ')).toBe(
      'Bolo de Cenoura',
    );
  });

  it('strips C0 control characters and DEL', () => {
    // Built from char codes rather than literal escapes in source, so no
    // raw control bytes end up embedded in this file.
    const nul = String.fromCharCode(0);
    const bell = String.fromCharCode(7);
    const del = String.fromCharCode(127);
    const withControlChars = ['Bolo', nul, ' de', bell, ' Cenoura', del].join(
      '',
    );
    expect(transform(sanitizeString, withControlChars)).toBe('Bolo de Cenoura');
  });

  it('keeps internal newlines, tabs, and carriage returns intact', () => {
    // These are explicitly excluded from the control-char strip set —
    // multi-line ingredient/instruction lists must survive sanitization.
    const withWhitespace = [
      'Linha 1',
      String.fromCharCode(10),
      'Linha 2',
      String.fromCharCode(9),
      'com tab',
    ].join('');
    expect(transform(sanitizeString, withWhitespace)).toBe(withWhitespace);
  });

  it('passes non-string values through untouched', () => {
    expect(transform(sanitizeString, 42)).toBe(42);
    expect(transform(sanitizeString, null)).toBeNull();
    expect(transform(sanitizeString, undefined)).toBeUndefined();
  });
});

describe('sanitizeStringArray', () => {
  it('trims and strips control characters from every string element', () => {
    const result = transform(sanitizeStringArray, [
      '  2 cenouras  ',
      '3 ovos ',
    ]);
    expect(result).toEqual(['2 cenouras', '3 ovos']);
  });

  it('leaves non-string elements untouched', () => {
    const result = transform(sanitizeStringArray, ['a', 1, null]);
    expect(result).toEqual(['a', 1, null]);
  });

  it('passes non-array values through untouched', () => {
    expect(transform(sanitizeStringArray, 'not an array')).toBe('not an array');
    expect(transform(sanitizeStringArray, null)).toBeNull();
  });
});

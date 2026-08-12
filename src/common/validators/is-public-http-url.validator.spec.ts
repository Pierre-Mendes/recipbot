import { IsPublicHttpUrlConstraint } from './is-public-http-url.validator';

describe('IsPublicHttpUrlConstraint', () => {
  const constraint = new IsPublicHttpUrlConstraint();

  it('accepts an ordinary public https URL', () => {
    expect(constraint.validate('https://example.com/recipe')).toBe(true);
  });

  it('accepts an ordinary public http URL', () => {
    expect(constraint.validate('http://example.com/recipe')).toBe(true);
  });

  it('rejects non-string values', () => {
    expect(constraint.validate(42)).toBe(false);
    expect(constraint.validate(null)).toBe(false);
    expect(constraint.validate(undefined)).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(constraint.validate('not a url')).toBe(false);
  });

  it.each([
    'ftp://example.com/file',
    'file:///etc/passwd',
    'javascript:alert(1)',
  ])('rejects non-http(s) schemes (%s)', (url) => {
    expect(constraint.validate(url)).toBe(false);
  });

  it.each([
    'http://localhost',
    'http://localhost:8080/admin',
    'http://0.0.0.0',
  ])('rejects blocked hostnames (%s)', (url) => {
    expect(constraint.validate(url)).toBe(false);
  });

  it.each([
    'http://127.0.0.1',
    'http://10.0.0.5',
    'http://192.168.1.1',
    'http://169.254.169.254',
  ])('rejects private/reserved IPv4 literals (%s)', (url) => {
    expect(constraint.validate(url)).toBe(false);
  });

  it('accepts a public IPv4 literal', () => {
    expect(constraint.validate('http://93.184.216.34')).toBe(true);
  });

  it('provides a helpful default message', () => {
    expect(constraint.defaultMessage()).toContain('public http(s) URL');
  });
});

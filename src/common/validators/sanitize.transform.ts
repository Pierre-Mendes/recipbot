import { TransformFnParams } from 'class-transformer';

// C0 control characters and DEL, excluding \t (9), \n (10), \r (13).
const CONTROL_CHAR_CODES = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
  25, 26, 27, 28, 29, 30, 31, 127,
];
const CONTROL_CHARS = new RegExp(
  `[${CONTROL_CHAR_CODES.map((code) => String.fromCharCode(code)).join('')}]`,
  'g',
);

/**
 * Strips null bytes/control characters and trims whitespace before
 * validation runs, so stored-XSS/log-injection payloads relying on
 * control characters never reach the database (OWASP A03: Injection).
 */
export function sanitizeString({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  return value.replace(CONTROL_CHARS, '').trim();
}

export function sanitizeStringArray({ value }: TransformFnParams): unknown {
  if (!Array.isArray(value)) {
    return value;
  }
  return value.map((item) =>
    typeof item === 'string' ? item.replace(CONTROL_CHARS, '').trim() : item,
  );
}

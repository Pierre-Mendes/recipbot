import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time string comparison for secrets (webhook tokens, API keys).
 * A plain `===` short-circuits on the first differing byte, letting an
 * attacker infer the secret one character at a time from response
 * timing; this always compares the full buffer.
 */
export function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    // Compare something of equal length anyway so a length mismatch
    // doesn't return measurably faster than a same-length mismatch.
    timingSafeEqual(bufA, bufA);
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}

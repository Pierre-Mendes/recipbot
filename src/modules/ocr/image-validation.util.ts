import {
  ALLOWED_IMAGE_MIME_TYPES,
  AllowedImageMimeType,
  MAX_IMAGE_BYTES,
} from './ocr.constants';
import { InvalidImageException } from './exceptions/invalid-image.exception';

/**
 * Sniffs the actual file type from magic bytes rather than trusting the
 * caller-supplied mime type — a Telegram client (or an attacker) can label
 * arbitrary bytes as "image/png" (OWASP: unrestricted file upload).
 */
export function detectImageMimeType(
  buffer: Buffer,
): AllowedImageMimeType | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Validates size, declared mime type, and sniffed mime type, throwing
 * InvalidImageException on the first violation. Returns the verified
 * (sniffed) mime type for use in the Gemini request.
 */
export function validateImage(
  buffer: Buffer,
  declaredMimeType: string,
): AllowedImageMimeType {
  if (buffer.length === 0) {
    throw new InvalidImageException('empty file');
  }

  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new InvalidImageException(
      `file exceeds maximum size of ${MAX_IMAGE_BYTES} bytes`,
    );
  }

  if (
    !ALLOWED_IMAGE_MIME_TYPES.includes(declaredMimeType as AllowedImageMimeType)
  ) {
    throw new InvalidImageException(
      `unsupported declared mime type "${declaredMimeType}"`,
    );
  }

  const sniffed = detectImageMimeType(buffer);
  if (!sniffed) {
    throw new InvalidImageException(
      'file content does not match a supported image format',
    );
  }

  if (sniffed !== declaredMimeType) {
    throw new InvalidImageException(
      `declared mime type "${declaredMimeType}" does not match file content ("${sniffed}")`,
    );
  }

  return sniffed;
}

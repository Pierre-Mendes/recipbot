import { detectImageMimeType, validateImage } from './image-validation.util';
import { InvalidImageException } from './exceptions/invalid-image.exception';
import { MAX_IMAGE_BYTES } from './ocr.constants';

const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG_HEADER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
]);
const WEBP_HEADER = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP', 'ascii'),
]);

describe('detectImageMimeType', () => {
  it('detects JPEG by magic bytes', () => {
    expect(detectImageMimeType(JPEG_HEADER)).toBe('image/jpeg');
  });

  it('detects PNG by magic bytes', () => {
    expect(detectImageMimeType(PNG_HEADER)).toBe('image/png');
  });

  it('detects WEBP by RIFF/WEBP markers', () => {
    expect(detectImageMimeType(WEBP_HEADER)).toBe('image/webp');
  });

  it('returns null for unrecognized content', () => {
    expect(detectImageMimeType(Buffer.from('not an image'))).toBeNull();
  });

  it('returns null for empty/too-short buffers', () => {
    expect(detectImageMimeType(Buffer.alloc(0))).toBeNull();
    expect(detectImageMimeType(Buffer.from([0xff, 0xd8]))).toBeNull();
  });
});

describe('validateImage', () => {
  it('accepts a valid PNG with a matching declared mime type', () => {
    expect(validateImage(PNG_HEADER, 'image/png')).toBe('image/png');
  });

  it('rejects an empty buffer', () => {
    expect(() => validateImage(Buffer.alloc(0), 'image/png')).toThrow(
      InvalidImageException,
    );
  });

  it('rejects a buffer larger than the max size', () => {
    const oversized = Buffer.concat([
      PNG_HEADER,
      Buffer.alloc(MAX_IMAGE_BYTES),
    ]);
    expect(() => validateImage(oversized, 'image/png')).toThrow(
      InvalidImageException,
    );
  });

  it('rejects a declared mime type outside the allowlist', () => {
    expect(() => validateImage(PNG_HEADER, 'image/gif')).toThrow(
      InvalidImageException,
    );
  });

  it('rejects content that does not sniff as an image at all', () => {
    expect(() =>
      validateImage(Buffer.from('<html>not an image</html>'), 'image/png'),
    ).toThrow(InvalidImageException);
  });

  it('rejects a mismatch between declared and sniffed mime type (spoofing)', () => {
    // Real PNG bytes labeled as JPEG.
    expect(() => validateImage(PNG_HEADER, 'image/jpeg')).toThrow(
      InvalidImageException,
    );
  });
});

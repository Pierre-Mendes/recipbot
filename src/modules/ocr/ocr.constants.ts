export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
// gemini-2.0-flash was shut down by Google; gemini-3.6-flash is the
// current stable flash-tier vision model (verified against
// https://ai.google.dev/gemini-api/docs/models on 2026-08-12).
export const DEFAULT_VISION_MODEL = 'gemini-3.6-flash';

export const CALLBACK_ACTION = {
  CONFIRM: 'confirm',
  REJECT: 'reject',
  EDIT: 'edit',
} as const;

export const MAX_TELEGRAM_MESSAGE_LENGTH = 4096;
export const TRUNCATION_SUFFIX = '\n…(preview truncated)';

export const EDIT_SESSION_TTL_MS = 10 * 60 * 1000;

// Telegram re-encodes anything sent as a "photo" message to JPEG.
export const TELEGRAM_PHOTO_MIME_TYPE = 'image/jpeg';

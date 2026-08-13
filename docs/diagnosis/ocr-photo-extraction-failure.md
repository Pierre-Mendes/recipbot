# Diagnosis: Bot fails to extract content from recipe screenshots

**Date:** 2026-08-12
**Scope:** `src/modules/ocr`, `src/modules/bot` (photo handler)
**Status:** Root cause confirmed from a live run against the deployed bot. Fix not yet applied.

## Trace: photo → Gemini Vision flow

**1. File resolution** (`bot.service.ts`, `handlePhoto`)
- `ctx.message.photo` is Telegram's array of `PhotoSize` objects (same image at multiple resolutions, ascending by size). `photos[photos.length - 1]` correctly picks the highest-resolution version.
- `ctx.telegram.getFileLink(largest.file_id)` resolves the `file_id` to a temporary download URL via Telegram's Bot API `getFile` method — fine.
- `fetch(fileLink.href)` downloads the bytes; `Buffer.from(await response.arrayBuffer())` builds the buffer — fine, no truncation/streaming issues.

**2. Mimetype** (`bot.constants.ts`, `TELEGRAM_PHOTO_MIME_TYPE = 'image/jpeg'`)
- Passed as the declared mimetype into `ocrService.extractRecipeFromImage(buffer, 'image/jpeg')`. Correct — Telegram always re-encodes uploaded photos to JPEG, so this is not a guess.

**3. Validation** (`image-validation.util.ts`, `validateImage`)
- Sniffs magic bytes (`0xFF 0xD8 0xFF` for JPEG), checks size ≤ 8 MB, and cross-checks the sniffed type against the declared type. For a genuine Telegram photo this passes cleanly.

**4. Prompt + request** (`ocr.service.ts`)
- `EXTRACTION_PROMPT` explicitly demands JSON-only output with the exact `{title, ingredients, instructions}` shape.
- `generationConfig: { responseMimeType: 'application/json' }` additionally enforces structured JSON at the API level.
- The image is sent correctly as `inlineData: { mimeType, data: imageBuffer.toString('base64') }` alongside the prompt text.
- Prompt structure and JSON enforcement are **not** the problem — they're solid.

**5. The actual failure** — confirmed from a live run captured in the app logs (a real test against the running bot, chat `851530571`):

```
[OcrService] Gemini Vision request failed: Error: [GoogleGenerativeAI Error]: Error fetching from
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent:
[404 Not Found] This model models/gemini-2.0-flash is no longer available. Please update your code
to use a newer model for the latest features and improvements.
```

The request reaches Gemini successfully (no auth/network error — the API key authenticates fine, ruling that out) and is rejected with a clean `404` because the model identifier being requested no longer exists on Google's side.

**6. Where that model name comes from** — `ocr.constants.ts`:
```ts
export const DEFAULT_VISION_MODEL = 'gemini-2.0-flash';
```
and `ocr.service.ts`:
```ts
this.modelName =
  this.config.get<string>('GEMINI_VISION_MODEL') ?? DEFAULT_VISION_MODEL;
```
`.env` also explicitly sets `GEMINI_VISION_MODEL=gemini-2.0-flash`, so both the env override and the code default point at the same retired model — there's no working fallback.

**7. Downstream effect:** `parseExtractionResponse` is never reached (the `catch` block in `ocr.service.ts` fires first), so the exception propagates to `BotService.handlePhoto`'s `catch`, which shows the user a generic *"I couldn't read that photo. Please try again with a clearer image."* — this is misleading; it implies an image-quality problem when the actual cause is a server-side model-not-found error unrelated to the photo itself.

## Summary

**(a) Root cause:** The Gemini model requested for OCR, `gemini-2.0-flash`, has been retired by Google (`404 Not Found` from the Gemini API). This is set as both the code default and the `.env` override, so there is no working model configured. Not a bug in file download, mimetype handling, or prompt/JSON enforcement — all of that is correct and never even gets the chance to run its output-parsing step.

**(b) Problematic code:**
```ts
// src/modules/ocr/ocr.constants.ts
export const DEFAULT_VISION_MODEL = 'gemini-2.0-flash';
```
```ts
// src/modules/ocr/ocr.service.ts
this.modelName =
  this.config.get<string>('GEMINI_VISION_MODEL') ?? DEFAULT_VISION_MODEL;
```
```
# .env
GEMINI_VISION_MODEL=gemini-2.0-flash
```

**(c) Suggested fix:** Update the model identifier (`DEFAULT_VISION_MODEL` and/or `.env`'s `GEMINI_VISION_MODEL`) to a currently active Gemini vision-capable model — confirm the exact valid name against Google's current model list (e.g. the API's `ListModels` endpoint or AI Studio) rather than hardcoding a guess, since this is exactly the kind of drift that caused the current break. Secondary, lower-priority UX fix: `BotService.handlePhoto`'s catch-all message conflates "model unreachable/misconfigured" with "bad photo" — distinguishing `OcrExtractionFailedException` from other failure modes there would surface this class of error much faster next time instead of looking like a camera/image-quality issue.

**No fix has been applied.** This file is diagnosis only, for review before deciding on the replacement model and whether to also touch the error-message UX.

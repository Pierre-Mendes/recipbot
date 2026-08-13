import { DEFAULT_VISION_MODEL } from './ocr.constants';

describe('ocr.constants', () => {
  it('DEFAULT_VISION_MODEL is not the retired gemini-2.0-flash model', () => {
    // gemini-2.0-flash was shut down by Google (404 Not Found from the
    // Gemini API) — see docs/diagnosis/ocr-photo-extraction-failure.md.
    // This pins the regression so a future revert doesn't silently
    // reintroduce the same outage.
    expect(DEFAULT_VISION_MODEL).not.toBe('gemini-2.0-flash');
  });

  it('DEFAULT_VISION_MODEL is the verified current model', () => {
    expect(DEFAULT_VISION_MODEL).toBe('gemini-3.6-flash');
  });
});

// text-embedding-004 is a fixed 768-dim model, matching the SDK versions
// pinned in package.json (@google/generative-ai 0.24.1 doesn't expose the
// outputDimensionality param needed to run gemini-embedding-001 at 1536).
export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-004';
export const EMBEDDING_DIMENSIONS = 768;
export const MAX_EMBEDDING_INPUT_LENGTH = 8000;

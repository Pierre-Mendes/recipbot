export interface OcrExtractionResult {
  title: string | null;
  ingredients: string[];
  instructions: string[];
  rawExtractedText: string;
}

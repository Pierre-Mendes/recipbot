export interface RecipeSearchResult {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  sourceUrl: string | null;
  createdAt: Date;
  /** Cosine similarity in [-1, 1], only present when a text query was used. */
  similarity: number | null;
}

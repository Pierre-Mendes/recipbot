import { DraftState } from '../enums/draft-state.enum';

export interface RecipeDraft {
  id: string;
  telegramChatId: string;
  state: DraftState;
  title: string | null;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  sourceUrl: string | null;
  rawExtractedText: string | null;
  createdAt: Date;
  updatedAt: Date;
}

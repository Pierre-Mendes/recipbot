export interface Recipe {
  id: string;
  telegramChatId: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  sourceUrl: string | null;
  createdAt: Date;
}

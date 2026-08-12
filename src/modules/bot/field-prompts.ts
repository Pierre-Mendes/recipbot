import { EditableDraftField } from '../recipes/editable-draft-field';

export const FIELD_PROMPTS: Record<EditableDraftField, string> = {
  title: 'Send the new title.',
  ingredients: 'Send the ingredients, one per line.',
  instructions: 'Send the steps, one per line.',
  tags: 'Send tags separated by commas (e.g. dessert, easy).',
  source_url: 'Send the recipe link (https://...).',
};

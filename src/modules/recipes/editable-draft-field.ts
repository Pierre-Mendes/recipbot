export type EditableDraftField =
  'title' | 'ingredients' | 'instructions' | 'tags' | 'source_url';

export const EDITABLE_DRAFT_FIELDS: readonly EditableDraftField[] = [
  'title',
  'ingredients',
  'instructions',
  'tags',
  'source_url',
];

/**
 * Turns the single line/block of text a user sends in chat into the shape
 * `UpdateRecipeDraftDto` expects for that field. Actual validation
 * (length, tag charset, URL safety, ...) still happens via the DTO —
 * this only decides how raw chat input is split into a string or array.
 */
export function parseDraftFieldInput(
  field: EditableDraftField,
  rawValue: string,
): string | string[] {
  switch (field) {
    case 'ingredients':
    case 'instructions':
      return rawValue
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    case 'tags':
      return rawValue
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
    case 'title':
    case 'source_url':
      return rawValue.trim();
  }
}

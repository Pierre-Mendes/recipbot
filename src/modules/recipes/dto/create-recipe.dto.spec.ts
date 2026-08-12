import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRecipeDto } from './create-recipe.dto';

function build(overrides: Record<string, unknown> = {}) {
  return plainToInstance(CreateRecipeDto, {
    telegram_chat_id: '123456789',
    title: 'Bolo de Cenoura',
    ingredients: ['2 cenouras', '3 ovos'],
    instructions: ['Bata tudo', 'Asse por 40 min'],
    tags: ['sobremesa', 'facil'],
    source_url: 'https://example.com/bolo',
    ...overrides,
  });
}

async function errorsFor(overrides: Record<string, unknown> = {}) {
  return validate(build(overrides), { whitelist: true });
}

describe('CreateRecipeDto', () => {
  it('accepts a fully valid payload', async () => {
    expect(await errorsFor()).toHaveLength(0);
  });

  it('accepts without an optional source_url', async () => {
    const errors = await errorsFor({ source_url: undefined });
    expect(errors).toHaveLength(0);
  });

  it('defaults tags to an empty array when the key is absent entirely', () => {
    // Must omit the `tags` key itself (not just set it to undefined) to
    // exercise the class field default rather than an explicit override.
    const instance = plainToInstance(CreateRecipeDto, {
      telegram_chat_id: '123456789',
      title: 'Bolo de Cenoura',
      ingredients: ['2 cenouras'],
      instructions: ['Bata tudo'],
    });
    expect(instance.tags).toEqual([]);
  });

  it('rejects a missing telegram_chat_id', async () => {
    expect(await errorsFor({ telegram_chat_id: undefined })).not.toHaveLength(
      0,
    );
  });

  it('rejects a non-numeric telegram_chat_id', async () => {
    expect(await errorsFor({ telegram_chat_id: 'abc123' })).not.toHaveLength(0);
  });

  it('accepts a negative telegram_chat_id (groups/channels)', async () => {
    expect(
      await errorsFor({ telegram_chat_id: '-1001234567890' }),
    ).toHaveLength(0);
  });

  it('rejects an empty title', async () => {
    expect(await errorsFor({ title: '' })).not.toHaveLength(0);
  });

  it('rejects a title over 255 characters', async () => {
    expect(await errorsFor({ title: 'a'.repeat(256) })).not.toHaveLength(0);
  });

  it('trims and control-char-strips the title via the sanitize transform', () => {
    const instance = build({ title: '  Bolo  ' });
    expect(instance.title).toBe('Bolo');
  });

  it('rejects empty ingredients', async () => {
    expect(await errorsFor({ ingredients: [] })).not.toHaveLength(0);
  });

  it('rejects an ingredients array over the max size', async () => {
    expect(
      await errorsFor({ ingredients: Array(201).fill('item') }),
    ).not.toHaveLength(0);
  });

  it('rejects empty instructions', async () => {
    expect(await errorsFor({ instructions: [] })).not.toHaveLength(0);
  });

  it('rejects a tag containing spaces or uppercase letters', async () => {
    expect(await errorsFor({ tags: ['Not Valid'] })).not.toHaveLength(0);
  });

  it('lowercases and trims tags via the transform', () => {
    const instance = build({ tags: ['  Sobremesa  '] });
    expect(instance.tags).toEqual(['sobremesa']);
  });

  it('rejects more than 20 tags', async () => {
    expect(
      await errorsFor({
        tags: Array.from({ length: 21 }, (_, i) => `tag${i}`),
      }),
    ).not.toHaveLength(0);
  });

  it('rejects a source_url pointing at a private IP (SSRF)', async () => {
    expect(
      await errorsFor({ source_url: 'http://127.0.0.1/admin' }),
    ).not.toHaveLength(0);
  });

  it('rejects a non-array tags value instead of crashing the lowercase transform', async () => {
    expect(await errorsFor({ tags: 'sobremesa' })).not.toHaveLength(0);
  });

  it('rejects unknown fields when whitelisted', async () => {
    const instance = build();
    (instance as unknown as Record<string, unknown>).extra_field = 'nope';
    const errors = await validate(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.some((e) => e.property === 'extra_field')).toBe(true);
  });
});

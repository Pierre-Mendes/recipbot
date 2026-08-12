import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateRecipeDto } from './update-recipe.dto';

async function errorsFor(payload: Record<string, unknown>) {
  return validate(plainToInstance(UpdateRecipeDto, payload), {
    whitelist: true,
  });
}

describe('UpdateRecipeDto', () => {
  it('accepts an empty payload — every field is optional', async () => {
    expect(await errorsFor({})).toHaveLength(0);
  });

  it('accepts a single-field partial update', async () => {
    expect(await errorsFor({ title: 'Novo Titulo' })).toHaveLength(0);
  });

  it('rejects an empty title when provided', async () => {
    expect(await errorsFor({ title: '' })).not.toHaveLength(0);
  });

  it('rejects empty ingredients when the field is provided at all', async () => {
    expect(await errorsFor({ ingredients: [] })).not.toHaveLength(0);
  });

  it('rejects a malformed tag', async () => {
    expect(await errorsFor({ tags: ['Has Spaces'] })).not.toHaveLength(0);
  });

  it('accepts an empty tags array (clearing all tags)', async () => {
    expect(await errorsFor({ tags: [] })).toHaveLength(0);
  });

  it('rejects a non-array tags value instead of crashing the lowercase transform', async () => {
    expect(await errorsFor({ tags: 'sobremesa' })).not.toHaveLength(0);
  });

  it('rejects a private source_url (SSRF)', async () => {
    expect(await errorsFor({ source_url: 'http://10.0.0.1' })).not.toHaveLength(
      0,
    );
  });

  it('does not accept telegram_chat_id — ownership cannot move between chats', async () => {
    const errors = await validate(
      plainToInstance(UpdateRecipeDto, { telegram_chat_id: '999' }),
      { whitelist: true, forbidNonWhitelisted: true },
    );
    expect(errors.some((e) => e.property === 'telegram_chat_id')).toBe(true);
  });
});

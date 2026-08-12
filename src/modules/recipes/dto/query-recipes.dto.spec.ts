import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryRecipesDto } from './query-recipes.dto';

async function build(payload: Record<string, unknown>) {
  const instance = plainToInstance(QueryRecipesDto, payload);
  const errors = await validate(instance, { whitelist: true });
  return { instance, errors };
}

describe('QueryRecipesDto', () => {
  it('accepts just a telegram_chat_id and defaults page/limit', async () => {
    const { instance, errors } = await build({ telegram_chat_id: '123' });
    expect(errors).toHaveLength(0);
    expect(instance.page).toBe(1);
    expect(instance.limit).toBe(20);
  });

  it('requires telegram_chat_id — every read must be chat-scoped', async () => {
    const { errors } = await build({});
    expect(errors.some((e) => e.property === 'telegram_chat_id')).toBe(true);
  });

  it('accepts an optional natural-language query and tag filter together', async () => {
    const { errors } = await build({
      telegram_chat_id: '123',
      q: 'bolo de cenoura facil',
      tags: ['sobremesa', 'facil'],
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects page below 1', async () => {
    const { errors } = await build({ telegram_chat_id: '123', page: 0 });
    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  it('rejects limit above the max of 50', async () => {
    const { errors } = await build({ telegram_chat_id: '123', limit: 51 });
    expect(errors.some((e) => e.property === 'limit')).toBe(true);
  });

  it('coerces numeric-looking strings for page/limit (query params arrive as strings)', async () => {
    const { instance, errors } = await build({
      telegram_chat_id: '123',
      page: '2',
      limit: '10',
    });
    expect(errors).toHaveLength(0);
    expect(instance.page).toBe(2);
    expect(instance.limit).toBe(10);
  });

  it('rejects a malformed tag in the filter', async () => {
    const { errors } = await build({
      telegram_chat_id: '123',
      tags: ['Not Valid!'],
    });
    expect(errors.some((e) => e.property === 'tags')).toBe(true);
  });

  it('rejects a non-array tags value instead of crashing the lowercase transform', async () => {
    const { errors } = await build({
      telegram_chat_id: '123',
      tags: 'sobremesa',
    });
    expect(errors.some((e) => e.property === 'tags')).toBe(true);
  });

  it('rejects q over 500 characters', async () => {
    const { errors } = await build({
      telegram_chat_id: '123',
      q: 'a'.repeat(501),
    });
    expect(errors.some((e) => e.property === 'q')).toBe(true);
  });
});

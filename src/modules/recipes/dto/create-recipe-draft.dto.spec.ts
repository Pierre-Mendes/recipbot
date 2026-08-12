import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRecipeDraftDto } from './create-recipe-draft.dto';

function build(overrides: Record<string, unknown> = {}) {
  return plainToInstance(CreateRecipeDraftDto, {
    telegram_chat_id: '123456789',
    ...overrides,
  });
}

async function errorsFor(overrides: Record<string, unknown> = {}) {
  return validate(build(overrides), { whitelist: true });
}

describe('CreateRecipeDraftDto', () => {
  it('accepts just a telegram_chat_id — every extraction field is optional', async () => {
    expect(await errorsFor()).toHaveLength(0);
  });

  it('rejects a missing telegram_chat_id', async () => {
    expect(await errorsFor({ telegram_chat_id: undefined })).not.toHaveLength(
      0,
    );
  });

  it('accepts a fully populated OCR extraction payload', async () => {
    const errors = await errorsFor({
      title: 'Bolo de Cenoura',
      ingredients: ['2 cenouras'],
      instructions: ['Assar'],
      tags: ['sobremesa'],
      source_url: 'https://example.com/bolo',
      raw_extracted_text: 'texto bruto extraido da imagem',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects raw_extracted_text over 20000 characters', async () => {
    expect(
      await errorsFor({ raw_extracted_text: 'a'.repeat(20001) }),
    ).not.toHaveLength(0);
  });

  it('accepts raw_extracted_text at exactly the max length', async () => {
    expect(
      await errorsFor({ raw_extracted_text: 'a'.repeat(20000) }),
    ).toHaveLength(0);
  });

  it('rejects a source_url pointing at a private IP (SSRF)', async () => {
    expect(
      await errorsFor({
        source_url: 'http://169.254.169.254/latest/meta-data',
      }),
    ).not.toHaveLength(0);
  });

  it('rejects a non-array tags value instead of crashing the lowercase transform', async () => {
    expect(await errorsFor({ tags: 'sobremesa' })).not.toHaveLength(0);
  });

  it('does not accept a state field — drafts are always created PENDING_CONFIRMATION', async () => {
    const errors = await validate(build({ state: 'CONFIRMED' }), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.some((e) => e.property === 'state')).toBe(true);
  });
});

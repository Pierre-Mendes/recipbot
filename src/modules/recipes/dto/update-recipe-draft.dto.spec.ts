import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateRecipeDraftDto } from './update-recipe-draft.dto';
import { DraftState } from '../enums/draft-state.enum';

async function errorsFor(payload: Record<string, unknown>) {
  return validate(plainToInstance(UpdateRecipeDraftDto, payload), {
    whitelist: true,
  });
}

describe('UpdateRecipeDraftDto', () => {
  it('accepts an empty payload — every field is optional', async () => {
    expect(await errorsFor({})).toHaveLength(0);
  });

  it.each(Object.values(DraftState))('accepts state = %s', async (state) => {
    expect(await errorsFor({ state })).toHaveLength(0);
  });

  it('rejects a state value outside the enum', async () => {
    expect(await errorsFor({ state: 'ARCHIVED' })).not.toHaveLength(0);
  });

  it('rejects a tag with characters the lowercase transform cannot fix', async () => {
    // The DTO lowercases tags before validating, so casing alone never
    // fails — only characters outside [a-z0-9-] do.
    expect(await errorsFor({ tags: ['not valid!'] })).not.toHaveLength(0);
  });

  it('accepts a tag that only differs by casing (normalized by the transform)', async () => {
    expect(await errorsFor({ tags: ['SOBREMESA'] })).toHaveLength(0);
  });

  it('rejects a non-array tags value instead of crashing the lowercase transform', async () => {
    expect(await errorsFor({ tags: 'sobremesa' })).not.toHaveLength(0);
  });

  it('rejects a private source_url (SSRF) — protects the link-edit flow', async () => {
    expect(
      await errorsFor({ source_url: 'http://localhost:9000/internal' }),
    ).not.toHaveLength(0);
  });

  it('accepts a public source_url', async () => {
    expect(
      await errorsFor({ source_url: 'https://example.com/recipe' }),
    ).toHaveLength(0);
  });

  it('does not accept telegram_chat_id or raw_extracted_text — not editable after creation', async () => {
    const errors = await validate(
      plainToInstance(UpdateRecipeDraftDto, {
        telegram_chat_id: '999',
        raw_extracted_text: 'tampered',
      }),
      { whitelist: true, forbidNonWhitelisted: true },
    );
    const rejectedProps = errors.map((e) => e.property);
    expect(rejectedProps).toEqual(
      expect.arrayContaining(['telegram_chat_id', 'raw_extracted_text']),
    );
  });
});

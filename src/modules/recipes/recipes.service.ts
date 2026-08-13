import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { DatabaseService } from '../../common/database/database.service';
import { DraftsRepository, UpdatableDraftFields } from './drafts.repository';
import { RecipesRepository } from './recipes.repository';
import { RecipeDraft } from './interfaces/draft.interface';
import { Recipe } from './interfaces/recipe.interface';
import { DraftState } from './enums/draft-state.enum';
import { UpdateRecipeDraftDto } from './dto/update-recipe-draft.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import {
  EditableDraftField,
  parseDraftFieldInput,
} from './editable-draft-field';
import { DraftNotFoundException } from './exceptions/draft-not-found.exception';
import { DraftValidationException } from './exceptions/draft-validation.exception';
import { EmbeddingService } from '../rag/embedding.service';
import { buildRecipeEmbeddingText } from '../rag/recipe-embedding-text.util';

export interface DraftExtractionInput {
  title: string | null;
  ingredients: string[];
  instructions: string[];
  rawExtractedText: string;
}

/**
 * class-validator constraint keys that exist purely to enforce "this core
 * field is non-empty". The wizard treats nome/ingredientes/modo_de_preparo
 * as never-blocking (docs/bot-conversation-flow.md, US07) — confirmDraft
 * strips exactly these constraint keys when allowIncomplete is true, so
 * every *other* rule (max length, tag pattern, URL safety, ...) still
 * applies even to an intentionally incomplete save.
 */
const CORE_EMPTINESS_CONSTRAINTS: Readonly<
  Record<string, ReadonlyArray<string>>
> = {
  title: ['minLength'],
  ingredients: ['arrayMinSize'],
  instructions: ['arrayMinSize'],
};

const CORE_FIELD_LABELS_PT_BR: Readonly<Record<string, string>> = {
  title: 'nome',
  ingredients: 'ingredientes',
  instructions: 'modo de preparo',
};

@Injectable()
export class RecipesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly draftsRepository: DraftsRepository,
    private readonly recipesRepository: RecipesRepository,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /** True if this chat has ever created a draft or a saved recipe — drives conditional onboarding (US05). */
  async hasHistory(chatId: string): Promise<boolean> {
    const [hasDrafts, hasRecipes] = await Promise.all([
      this.draftsRepository.existsForChat(chatId),
      this.recipesRepository.existsForChat(chatId),
    ]);
    return hasDrafts || hasRecipes;
  }

  async createEmptyDraft(
    chatId: string,
    wizardStep: string,
  ): Promise<RecipeDraft> {
    return this.draftsRepository.create({
      chatId,
      title: null,
      ingredients: [],
      instructions: [],
      tags: [],
      sourceUrl: null,
      rawExtractedText: null,
      wizardStep,
      collectedFields: {},
    });
  }

  async createDraftFromExtraction(
    chatId: string,
    extraction: DraftExtractionInput,
    wizardStep: string,
    sourceUrl: string | null = null,
  ): Promise<RecipeDraft> {
    return this.draftsRepository.create({
      chatId,
      title: extraction.title,
      ingredients: extraction.ingredients,
      instructions: extraction.instructions,
      tags: [],
      sourceUrl,
      rawExtractedText: extraction.rawExtractedText,
      wizardStep,
      collectedFields: {},
    });
  }

  async getDraft(chatId: string, draftId: string): Promise<RecipeDraft> {
    const draft = await this.draftsRepository.findById(draftId, chatId);
    if (!draft) {
      throw new DraftNotFoundException();
    }
    return draft;
  }

  async findLatestInProgressDraft(chatId: string): Promise<RecipeDraft | null> {
    return this.draftsRepository.findLatestInProgress(chatId);
  }

  async updateWizardState(
    chatId: string,
    draftId: string,
    wizardStep: string | null,
    collectedFields: Record<string, unknown>,
  ): Promise<RecipeDraft> {
    const updated = await this.draftsRepository.updateWizardState(
      draftId,
      chatId,
      wizardStep,
      collectedFields,
    );
    if (!updated) {
      throw new DraftNotFoundException();
    }
    return updated;
  }

  /** Blanks out typed fields the wizard is jumping past or re-asking (US07 back/forward navigation). */
  async clearDraftFields(
    chatId: string,
    draftId: string,
    fields: ReadonlyArray<EditableDraftField>,
  ): Promise<RecipeDraft> {
    const updated = await this.draftsRepository.clearFields(
      draftId,
      chatId,
      fields,
    );
    if (!updated) {
      throw new DraftNotFoundException();
    }
    return updated;
  }

  async updateDraftField(
    chatId: string,
    draftId: string,
    field: EditableDraftField,
    rawValue: string,
  ): Promise<RecipeDraft> {
    await this.getDraft(chatId, draftId);

    const parsedValue = parseDraftFieldInput(field, rawValue);
    const instance = plainToInstance(UpdateRecipeDraftDto, {
      [field]: parsedValue,
    });
    const errors = await validate(instance, { whitelist: true });
    if (errors.length > 0) {
      throw new DraftValidationException(collectMessages(errors));
    }

    const updated = await this.draftsRepository.updateFields(draftId, chatId, {
      [field]: instance[field],
    } as UpdatableDraftFields);

    if (!updated) {
      throw new DraftNotFoundException();
    }
    return updated;
  }

  /** Pure check — which core fields (pt-BR labels) are still empty, for the soft-warning at final confirmation. */
  getMissingCoreFields(draft: RecipeDraft): string[] {
    const missing: string[] = [];
    if (!draft.title || draft.title.trim().length === 0)
      missing.push(CORE_FIELD_LABELS_PT_BR.title);
    if (draft.ingredients.length === 0)
      missing.push(CORE_FIELD_LABELS_PT_BR.ingredients);
    if (draft.instructions.length === 0)
      missing.push(CORE_FIELD_LABELS_PT_BR.instructions);
    return missing;
  }

  /**
   * allowIncomplete=true is the "Salvar assim mesmo" path: nome/ingredientes/
   * modo_de_preparo are allowed to be empty (US07 — nothing ever hard-blocks
   * a save), but every other DTO rule (lengths, tag charset, SSRF-checked
   * URL) still applies.
   */
  async confirmDraft(
    chatId: string,
    draftId: string,
    allowIncomplete = false,
  ): Promise<Recipe> {
    const draft = await this.getDraft(chatId, draftId);

    const candidate = plainToInstance(CreateRecipeDto, {
      telegram_chat_id: chatId,
      title: draft.title ?? '',
      ingredients: draft.ingredients,
      instructions: draft.instructions,
      tags: draft.tags,
      source_url: draft.sourceUrl ?? undefined,
    });
    let errors = await validate(candidate, { whitelist: true });
    if (allowIncomplete) {
      errors = errors.filter((error) => !isCoreEmptinessOnlyError(error));
    }
    if (errors.length > 0) {
      throw new DraftValidationException(collectMessages(errors));
    }

    const embeddingText = buildRecipeEmbeddingText({
      title: candidate.title,
      ingredients: candidate.ingredients,
      instructions: candidate.instructions,
      tags: candidate.tags,
    });
    // An allowIncomplete save can leave every field empty; embedDocument()
    // rejects blank input, so skip it rather than crash the save.
    const embedding =
      embeddingText.trim().length > 0
        ? await this.embeddingService.embedDocument(embeddingText)
        : null;

    return this.db.withTransaction(async (queryable) => {
      const recipe = await this.recipesRepository.create(
        {
          chatId,
          title: candidate.title,
          ingredients: candidate.ingredients,
          instructions: candidate.instructions,
          tags: candidate.tags,
          sourceUrl: candidate.source_url ?? null,
          embedding,
        },
        queryable,
      );
      await this.draftsRepository.delete(draftId, chatId, queryable);
      return recipe;
    });
  }

  async rejectDraft(chatId: string, draftId: string): Promise<void> {
    const updated = await this.draftsRepository.updateState(
      draftId,
      chatId,
      DraftState.REJECTED,
    );
    if (!updated) {
      throw new DraftNotFoundException();
    }
    await this.draftsRepository.delete(draftId, chatId);
  }
}

function isCoreEmptinessOnlyError(error: ValidationError): boolean {
  const relevantConstraints = CORE_EMPTINESS_CONSTRAINTS[error.property];
  if (!relevantConstraints) return false;
  const constraintKeys = Object.keys(error.constraints ?? {});
  return (
    constraintKeys.length > 0 &&
    constraintKeys.every((key) => relevantConstraints.includes(key))
  );
}

function collectMessages(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

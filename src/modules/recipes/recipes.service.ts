import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
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

@Injectable()
export class RecipesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly draftsRepository: DraftsRepository,
    private readonly recipesRepository: RecipesRepository,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async createDraftFromExtraction(
    chatId: string,
    extraction: DraftExtractionInput,
  ): Promise<RecipeDraft> {
    return this.draftsRepository.create({
      chatId,
      title: extraction.title,
      ingredients: extraction.ingredients,
      instructions: extraction.instructions,
      tags: [],
      sourceUrl: null,
      rawExtractedText: extraction.rawExtractedText,
    });
  }

  async getDraft(chatId: string, draftId: string): Promise<RecipeDraft> {
    const draft = await this.draftsRepository.findById(draftId, chatId);
    if (!draft) {
      throw new DraftNotFoundException();
    }
    return draft;
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

  async confirmDraft(chatId: string, draftId: string): Promise<Recipe> {
    const draft = await this.getDraft(chatId, draftId);

    const candidate = plainToInstance(CreateRecipeDto, {
      telegram_chat_id: chatId,
      title: draft.title ?? '',
      ingredients: draft.ingredients,
      instructions: draft.instructions,
      tags: draft.tags,
      source_url: draft.sourceUrl ?? undefined,
    });
    const errors = await validate(candidate, { whitelist: true });
    if (errors.length > 0) {
      throw new DraftValidationException(collectMessages(errors));
    }

    const embeddingText = buildRecipeEmbeddingText({
      title: candidate.title,
      ingredients: candidate.ingredients,
      instructions: candidate.instructions,
      tags: candidate.tags,
    });
    const embedding = await this.embeddingService.embedDocument(embeddingText);

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

function collectMessages(
  errors: Awaited<ReturnType<typeof validate>>,
): string[] {
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

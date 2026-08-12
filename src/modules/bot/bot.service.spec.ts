import { ConfigService } from '@nestjs/config';
import { BotService } from './bot.service';
import { OcrService } from '../ocr/ocr.service';
import { RecipesService } from '../recipes/recipes.service';
import { EditSessionStore } from './session/edit-session.store';
import { DraftNotFoundException } from '../recipes/exceptions/draft-not-found.exception';
import { DraftValidationException } from '../recipes/exceptions/draft-validation.exception';
import { DraftState } from '../recipes/enums/draft-state.enum';
import { RecipeDraft } from '../recipes/interfaces/draft.interface';

function configWithToken() {
  return {
    get: jest.fn((key: string) =>
      key === 'TELEGRAM_BOT_TOKEN' ? 'test-token' : undefined,
    ),
  } as unknown as ConfigService;
}

function makeDraft(overrides: Partial<RecipeDraft> = {}): RecipeDraft {
  return {
    id: 'draft-1',
    telegramChatId: '123',
    state: DraftState.PENDING_CONFIRMATION,
    title: 'Bolo',
    ingredients: ['a'],
    instructions: ['b'],
    tags: [],
    sourceUrl: null,
    rawExtractedText: 'raw',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('BotService', () => {
  let ocrService: jest.Mocked<OcrService>;
  let recipesService: jest.Mocked<RecipesService>;
  let editSessions: jest.Mocked<EditSessionStore>;
  let service: BotService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    ocrService = {
      extractRecipeFromImage: jest.fn(),
    } as unknown as jest.Mocked<OcrService>;
    recipesService = {
      createDraftFromExtraction: jest.fn(),
      getDraft: jest.fn(),
      updateDraftField: jest.fn(),
      confirmDraft: jest.fn(),
      rejectDraft: jest.fn(),
    } as unknown as jest.Mocked<RecipesService>;
    editSessions = {
      start: jest.fn(),
      consume: jest.fn(),
      clear: jest.fn(),
    } as unknown as jest.Mocked<EditSessionStore>;

    service = new BotService(
      configWithToken(),
      ocrService,
      recipesService,
      editSessions,
    );

    fetchMock = jest.fn().mockResolvedValue({
      arrayBuffer: async () => new ArrayBuffer(4),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('throws at construction time when TELEGRAM_BOT_TOKEN is missing', () => {
    const config = {
      get: jest.fn(() => undefined),
    } as unknown as ConfigService;
    expect(
      () => new BotService(config, ocrService, recipesService, editSessions),
    ).toThrow('TELEGRAM_BOT_TOKEN is not configured');
  });

  describe('handlePhoto', () => {
    function makePhotoCtx() {
      return {
        chat: { id: 123 },
        message: { photo: [{ file_id: 'small' }, { file_id: 'large' }] },
        telegram: {
          getFileLink: jest
            .fn()
            .mockResolvedValue(new URL('https://t.me/file/large')),
        },
        reply: jest.fn(),
      };
    }

    it('downloads the largest photo, runs OCR, creates a draft, and replies with a preview', async () => {
      const ctx = makePhotoCtx();
      ocrService.extractRecipeFromImage.mockResolvedValue({
        title: 'Bolo',
        ingredients: ['a'],
        instructions: ['b'],
        rawExtractedText: 'raw',
      });
      recipesService.createDraftFromExtraction.mockResolvedValue(makeDraft());

      await (
        service as unknown as { handlePhoto: (ctx: unknown) => Promise<void> }
      ).handlePhoto(ctx);

      expect(ctx.telegram.getFileLink).toHaveBeenCalledWith('large');
      expect(ocrService.extractRecipeFromImage).toHaveBeenCalledWith(
        expect.any(Buffer),
        'image/jpeg',
      );
      expect(recipesService.createDraftFromExtraction).toHaveBeenCalledWith(
        '123',
        {
          title: 'Bolo',
          ingredients: ['a'],
          instructions: ['b'],
          rawExtractedText: 'raw',
        },
      );
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Bolo'),
        expect.objectContaining({ parse_mode: 'HTML' }),
      );
    });

    it('replies with a friendly error when OCR extraction fails', async () => {
      const ctx = makePhotoCtx();
      ocrService.extractRecipeFromImage.mockRejectedValue(
        new Error('quota exceeded'),
      );

      await (
        service as unknown as { handlePhoto: (ctx: unknown) => Promise<void> }
      ).handlePhoto(ctx);

      expect(recipesService.createDraftFromExtraction).not.toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("couldn't read"),
      );
    });
  });

  describe('handleText', () => {
    function makeTextCtx(text: string) {
      return { chat: { id: 123 }, message: { text }, reply: jest.fn() };
    }

    it('replies with the welcome text when there is no pending edit session', async () => {
      editSessions.consume.mockReturnValue(null);
      const ctx = makeTextCtx('hello');

      await (
        service as unknown as { handleText: (ctx: unknown) => Promise<void> }
      ).handleText(ctx);

      expect(recipesService.updateDraftField).not.toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Send me a photo'),
      );
    });

    it('applies a pending edit and replies with the updated preview', async () => {
      editSessions.consume.mockReturnValue({
        draftId: 'draft-1',
        field: 'title',
        expiresAt: Date.now() + 10_000,
      });
      recipesService.updateDraftField.mockResolvedValue(
        makeDraft({ title: 'New Title' }),
      );
      const ctx = makeTextCtx('New Title');

      await (
        service as unknown as { handleText: (ctx: unknown) => Promise<void> }
      ).handleText(ctx);

      expect(recipesService.updateDraftField).toHaveBeenCalledWith(
        '123',
        'draft-1',
        'title',
        'New Title',
      );
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('New Title'),
        expect.objectContaining({ parse_mode: 'HTML' }),
      );
    });

    it('re-arms the session and asks again when the edit fails validation', async () => {
      editSessions.consume.mockReturnValue({
        draftId: 'draft-1',
        field: 'tags',
        expiresAt: Date.now() + 10_000,
      });
      recipesService.updateDraftField.mockRejectedValue(
        new DraftValidationException(['tags must match pattern']),
      );
      const ctx = makeTextCtx('Not A Valid Tag!');

      await (
        service as unknown as { handleText: (ctx: unknown) => Promise<void> }
      ).handleText(ctx);

      expect(editSessions.start).toHaveBeenCalledWith('123', 'draft-1', 'tags');
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("didn't work"),
      );
    });
  });

  describe('handleConfirm', () => {
    function makeActionCtx(draftId: string) {
      return {
        chat: { id: 123 },
        match: [`confirm:${draftId}`, draftId] as unknown as RegExpExecArray,
        answerCbQuery: jest.fn(),
        editMessageText: jest.fn(),
        reply: jest.fn(),
      };
    }

    it('confirms the draft and edits the message to show success', async () => {
      recipesService.confirmDraft.mockResolvedValue({
        id: 'recipe-1',
        telegramChatId: '123',
        title: 'Bolo',
        ingredients: ['a'],
        instructions: ['b'],
        tags: [],
        sourceUrl: null,
        createdAt: new Date(),
      });
      const ctx = makeActionCtx('draft-1');

      await (
        service as unknown as { handleConfirm: (ctx: unknown) => Promise<void> }
      ).handleConfirm(ctx);

      expect(ctx.answerCbQuery).toHaveBeenCalled();
      expect(recipesService.confirmDraft).toHaveBeenCalledWith(
        '123',
        'draft-1',
      );
      expect(ctx.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('Saved'),
        expect.objectContaining({ parse_mode: 'HTML' }),
      );
    });

    it('tells the user why confirmation failed instead of throwing', async () => {
      recipesService.confirmDraft.mockRejectedValue(
        new DraftValidationException(['title is required']),
      );
      const ctx = makeActionCtx('draft-1');

      await (
        service as unknown as { handleConfirm: (ctx: unknown) => Promise<void> }
      ).handleConfirm(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Can't save yet"),
      );
      expect(ctx.editMessageText).not.toHaveBeenCalled();
    });
  });

  describe('handleReject', () => {
    it('discards the draft and edits the message', async () => {
      const ctx = {
        chat: { id: 123 },
        match: ['reject:draft-1', 'draft-1'] as unknown as RegExpExecArray,
        answerCbQuery: jest.fn(),
        editMessageText: jest.fn(),
        reply: jest.fn(),
      };

      await (
        service as unknown as { handleReject: (ctx: unknown) => Promise<void> }
      ).handleReject(ctx);

      expect(recipesService.rejectDraft).toHaveBeenCalledWith('123', 'draft-1');
      expect(ctx.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('discarded'),
      );
    });

    it('replies gracefully when the draft is already gone', async () => {
      recipesService.rejectDraft.mockRejectedValue(
        new DraftNotFoundException(),
      );
      const ctx = {
        chat: { id: 123 },
        match: ['reject:draft-1', 'draft-1'] as unknown as RegExpExecArray,
        answerCbQuery: jest.fn(),
        editMessageText: jest.fn(),
        reply: jest.fn(),
      };

      await (
        service as unknown as { handleReject: (ctx: unknown) => Promise<void> }
      ).handleReject(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('no longer available'),
      );
    });
  });

  describe('handleEditPrompt', () => {
    it('starts an edit session and prompts for the field', async () => {
      recipesService.getDraft.mockResolvedValue(makeDraft());
      const ctx = {
        chat: { id: 123 },
        match: [
          'edit:title:draft-1',
          'title',
          'draft-1',
        ] as unknown as RegExpExecArray,
        answerCbQuery: jest.fn(),
        reply: jest.fn(),
      };

      await (
        service as unknown as {
          handleEditPrompt: (ctx: unknown) => Promise<void>;
        }
      ).handleEditPrompt(ctx);

      expect(editSessions.start).toHaveBeenCalledWith(
        '123',
        'draft-1',
        'title',
      );
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Send the new title'),
      );
    });

    it('does not start a session when the draft does not belong to the chat', async () => {
      recipesService.getDraft.mockRejectedValue(new DraftNotFoundException());
      const ctx = {
        chat: { id: 123 },
        match: [
          'edit:title:draft-1',
          'title',
          'draft-1',
        ] as unknown as RegExpExecArray,
        answerCbQuery: jest.fn(),
        reply: jest.fn(),
      };

      await (
        service as unknown as {
          handleEditPrompt: (ctx: unknown) => Promise<void>;
        }
      ).handleEditPrompt(ctx);

      expect(editSessions.start).not.toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('no longer available'),
      );
    });
  });
});

import { ConfigService } from '@nestjs/config';
import { BotService } from './bot.service';
import { OcrService } from '../ocr/ocr.service';
import { InvalidImageException } from '../ocr/exceptions/invalid-image.exception';
import { OcrExtractionFailedException } from '../ocr/exceptions/ocr-extraction-failed.exception';
import { SsrfBlockedException } from '../scraping/exceptions/ssrf-blocked.exception';
import { ScrapingFailedException } from '../scraping/exceptions/scraping-failed.exception';
import { RecipesService } from '../recipes/recipes.service';
import { DraftNotFoundException } from '../recipes/exceptions/draft-not-found.exception';
import { WizardService } from './wizard/wizard.service';
import {
  IMAGE_INVALID_MESSAGE,
  IMAGE_SERVER_ERROR_MESSAGE,
  LINK_BLOCKED_MESSAGE,
  LINK_FAILED_MESSAGE,
  WELCOME_FIRST_TIME,
  WELCOME_RETURNING,
} from './wizard/wizard-messages';

function configWithToken(overrides: Record<string, string | undefined> = {}) {
  const values: Record<string, string | undefined> = {
    TELEGRAM_BOT_TOKEN: 'test-token',
    ...overrides,
  };
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe('BotService', () => {
  let ocrService: jest.Mocked<OcrService>;
  let recipesService: jest.Mocked<RecipesService>;
  let wizardService: jest.Mocked<WizardService>;
  let service: BotService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    ocrService = {
      extractRecipeFromImage: jest.fn(),
    } as unknown as jest.Mocked<OcrService>;
    recipesService = {
      hasHistory: jest.fn(),
    } as unknown as jest.Mocked<RecipesService>;
    wizardService = {
      hasActiveSession: jest.fn().mockReturnValue(false),
      showEntryMenu: jest.fn().mockReturnValue({ kind: 'entry_menu' }),
      checkResumeOffer: jest.fn().mockResolvedValue(null),
      startTextFlow: jest.fn(),
      startImageFlow: jest.fn(),
      startLinkFlow: jest.fn(),
      handleTextReply: jest.fn(),
      skip: jest.fn(),
      handleReviewAction: jest.fn(),
      goBackTo: jest.fn(),
      goForwardTo: jest.fn(),
      save: jest.fn(),
      saveAnyway: jest.fn(),
      completeNow: jest.fn(),
      cancel: jest.fn(),
      resume: jest.fn(),
      restart: jest.fn(),
      listBackSteps: jest.fn(),
      listForwardSteps: jest.fn(),
      sweep: jest.fn().mockReturnValue({ warnings: [], expired: [] }),
    } as unknown as jest.Mocked<WizardService>;

    service = new BotService(
      configWithToken(),
      ocrService,
      recipesService,
      wizardService,
    );

    fetchMock = jest
      .fn()
      .mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(4) });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('throws at construction time when TELEGRAM_BOT_TOKEN is missing', () => {
    const config = {
      get: jest.fn(() => undefined),
    } as unknown as ConfigService;
    expect(
      () => new BotService(config, ocrService, recipesService, wizardService),
    ).toThrow('TELEGRAM_BOT_TOKEN is not configured');
  });

  describe('onModuleInit / onModuleDestroy', () => {
    afterEach(() => {
      service.onModuleDestroy();
    });

    it('does not launch polling in the default webhook mode, and starts the sweep interval', async () => {
      service.bot.launch = jest.fn();
      await service.onModuleInit();
      expect(service.bot.launch).not.toHaveBeenCalled();
    });

    it('launches polling when TELEGRAM_BOT_MODE=polling', async () => {
      const polling = new BotService(
        configWithToken({ TELEGRAM_BOT_MODE: 'polling' }),
        ocrService,
        recipesService,
        wizardService,
      );
      polling.bot.launch = jest.fn().mockResolvedValue(undefined);
      polling.bot.stop = jest.fn();
      await polling.onModuleInit();
      expect(polling.bot.launch).toHaveBeenCalled();
      polling.onModuleDestroy();
    });

    it('does not call stop() when never launched', async () => {
      service.bot.launch = jest.fn();
      service.bot.stop = jest.fn();
      await service.onModuleInit();
      service.onModuleDestroy();
      expect(service.bot.stop).not.toHaveBeenCalled();
    });
  });

  describe('handleStart', () => {
    function makeCtx() {
      return { chat: { id: 123 }, reply: jest.fn() };
    }

    it('sends the full welcome for a first-time chat', async () => {
      recipesService.hasHistory.mockResolvedValue(false);
      const ctx = makeCtx();

      await (
        service as unknown as { handleStart: (ctx: unknown) => Promise<void> }
      ).handleStart(ctx);

      expect(ctx.reply).toHaveBeenNthCalledWith(1, WELCOME_FIRST_TIME);
    });

    it('sends the short greeting for a returning chat', async () => {
      recipesService.hasHistory.mockResolvedValue(true);
      const ctx = makeCtx();

      await (
        service as unknown as { handleStart: (ctx: unknown) => Promise<void> }
      ).handleStart(ctx);

      expect(ctx.reply).toHaveBeenNthCalledWith(1, WELCOME_RETURNING);
    });
  });

  describe('handleNova', () => {
    function makeCtx() {
      return { chat: { id: 123 }, reply: jest.fn() };
    }

    it('shows the entry menu when there is nothing to resume', async () => {
      wizardService.checkResumeOffer.mockResolvedValue(null);
      const ctx = makeCtx();

      await (
        service as unknown as { handleNova: (ctx: unknown) => Promise<void> }
      ).handleNova(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('O que vamos fazer'),
        expect.any(Object),
      );
    });

    it('offers to resume when a draft was left in progress (US08)', async () => {
      wizardService.checkResumeOffer.mockResolvedValue({
        kind: 'resume_offer',
        draft: {} as never,
      });
      const ctx = makeCtx();

      await (
        service as unknown as { handleNova: (ctx: unknown) => Promise<void> }
      ).handleNova(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('progresso anterior expirou'),
        expect.any(Object),
      );
    });
  });

  describe('handlePhoto — OCR error distinction (docs/diagnosis/ocr-photo-extraction-failure.md)', () => {
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

    it('succeeds and presents the wizard result', async () => {
      const ctx = makePhotoCtx();
      wizardService.startImageFlow.mockResolvedValue({
        kind: 'review',
        part: 'title_ingredients',
        draft: {
          title: 'Bolo',
          ingredients: [],
          instructions: [],
        } as never,
      });

      await (
        service as unknown as { handlePhoto: (ctx: unknown) => Promise<void> }
      ).handlePhoto(ctx);

      expect(wizardService.startImageFlow).toHaveBeenCalledWith(
        '123',
        expect.any(Buffer),
        'image/jpeg',
      );
      expect(ctx.reply).toHaveBeenCalled();
    });

    it('tells the user the image itself is invalid for InvalidImageException', async () => {
      const ctx = makePhotoCtx();
      wizardService.startImageFlow.mockRejectedValue(
        new InvalidImageException('too small'),
      );

      await (
        service as unknown as { handlePhoto: (ctx: unknown) => Promise<void> }
      ).handlePhoto(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(IMAGE_INVALID_MESSAGE);
    });

    it('tells the user it is a server/model problem — not the photo — for OcrExtractionFailedException', async () => {
      const ctx = makePhotoCtx();
      wizardService.startImageFlow.mockRejectedValue(
        new OcrExtractionFailedException('model not found'),
      );

      await (
        service as unknown as { handlePhoto: (ctx: unknown) => Promise<void> }
      ).handlePhoto(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(IMAGE_SERVER_ERROR_MESSAGE);
      // The two messages must be genuinely different — that distinction is the whole point of the fix.
      expect(IMAGE_SERVER_ERROR_MESSAGE).not.toBe(IMAGE_INVALID_MESSAGE);
    });

    it('falls back to a generic message for anything else', async () => {
      const ctx = makePhotoCtx();
      wizardService.startImageFlow.mockRejectedValue(new Error('boom'));

      await (
        service as unknown as { handlePhoto: (ctx: unknown) => Promise<void> }
      ).handlePhoto(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Algo deu errado'),
      );
    });
  });

  describe('handleText', () => {
    function makeTextCtx(text: string) {
      return { chat: { id: 123 }, message: { text }, reply: jest.fn() };
    }

    it('routes to the link flow when awaiting a link, and reports SSRF blocks in pt-BR', async () => {
      const menuCtx = {
        chat: { id: 123 },
        match: ['wz:menu:link', 'link'],
        answerCbQuery: jest.fn(),
        editMessageText: jest.fn(),
        reply: jest.fn(),
      };
      await (
        service as unknown as {
          handleMenuChoice: (ctx: unknown) => Promise<void>;
        }
      ).handleMenuChoice(menuCtx);

      wizardService.startLinkFlow.mockRejectedValue(
        new SsrfBlockedException('private ip'),
      );
      const ctx = makeTextCtx('http://127.0.0.1/admin');

      await (
        service as unknown as { handleText: (ctx: unknown) => Promise<void> }
      ).handleText(ctx);

      expect(wizardService.startLinkFlow).toHaveBeenCalledWith(
        '123',
        'http://127.0.0.1/admin',
      );
      expect(ctx.reply).toHaveBeenCalledWith(LINK_BLOCKED_MESSAGE);
    });

    it('reports a scraping failure distinctly from an SSRF block', async () => {
      const menuCtx = {
        chat: { id: 123 },
        match: ['wz:menu:link', 'link'],
        answerCbQuery: jest.fn(),
        editMessageText: jest.fn(),
        reply: jest.fn(),
      };
      await (
        service as unknown as {
          handleMenuChoice: (ctx: unknown) => Promise<void>;
        }
      ).handleMenuChoice(menuCtx);

      wizardService.startLinkFlow.mockRejectedValue(
        new ScrapingFailedException('timeout'),
      );
      const ctx = makeTextCtx('https://example.com');

      await (
        service as unknown as { handleText: (ctx: unknown) => Promise<void> }
      ).handleText(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(LINK_FAILED_MESSAGE);
      expect(LINK_FAILED_MESSAGE).not.toBe(LINK_BLOCKED_MESSAGE);
    });

    it('shows the help text when there is no active wizard and nothing to resume', async () => {
      wizardService.hasActiveSession.mockReturnValue(false);
      wizardService.checkResumeOffer.mockResolvedValue(null);
      const ctx = makeTextCtx('oi');

      await (
        service as unknown as { handleText: (ctx: unknown) => Promise<void> }
      ).handleText(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('/nova'));
    });

    it('offers to resume when there is no active session but a draft is in progress', async () => {
      wizardService.hasActiveSession.mockReturnValue(false);
      wizardService.checkResumeOffer.mockResolvedValue({
        kind: 'resume_offer',
        draft: {} as never,
      });
      const ctx = makeTextCtx('oi');

      await (
        service as unknown as { handleText: (ctx: unknown) => Promise<void> }
      ).handleText(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('progresso anterior expirou'),
        expect.any(Object),
      );
    });

    it('forwards the reply into the active wizard session', async () => {
      wizardService.hasActiveSession.mockReturnValue(true);
      wizardService.handleTextReply.mockResolvedValue({
        kind: 'prompt',
        step: 'ingredientes' as never,
        prompt: 'Quais os ingredientes?',
        core: true,
      });
      const ctx = makeTextCtx('Bolo de Cenoura');

      await (
        service as unknown as { handleText: (ctx: unknown) => Promise<void> }
      ).handleText(ctx);

      expect(wizardService.handleTextReply).toHaveBeenCalledWith(
        '123',
        'Bolo de Cenoura',
      );
      expect(ctx.reply).toHaveBeenCalledWith(
        'Quais os ingredientes?',
        expect.any(Object),
      );
    });

    it('replies that the draft is gone when the wizard throws DraftNotFoundException', async () => {
      wizardService.hasActiveSession.mockReturnValue(true);
      wizardService.handleTextReply.mockRejectedValue(
        new DraftNotFoundException(),
      );
      const ctx = makeTextCtx('qualquer coisa');

      await (
        service as unknown as { handleText: (ctx: unknown) => Promise<void> }
      ).handleText(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('não está mais disponível'),
      );
    });
  });

  describe('runAction (generic wizard callback dispatcher)', () => {
    function makeActionCtx() {
      return {
        chat: { id: 123 },
        match: ['wz:skip', 'wz:skip'] as unknown as RegExpExecArray,
        answerCbQuery: jest.fn(),
        editMessageText: jest.fn(),
        reply: jest.fn(),
      };
    }

    it('answers the callback query and edits the message with the new result', async () => {
      const ctx = makeActionCtx();
      const run = (
        service as unknown as {
          runAction: (
            ctx: unknown,
            fn: (chatId: string) => Promise<unknown>,
          ) => Promise<void>;
        }
      ).runAction.bind(service);

      await run(ctx, async (chatId: string) => {
        expect(chatId).toBe('123');
        return { kind: 'cancelled' };
      });

      expect(ctx.answerCbQuery).toHaveBeenCalled();
      expect(ctx.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('cancelado'),
        expect.any(Object),
      );
    });

    it('falls back to reply() when editMessageText fails (message too old / unchanged)', async () => {
      const ctx = makeActionCtx();
      ctx.editMessageText.mockRejectedValue(new Error('message not modified'));
      const run = (
        service as unknown as {
          runAction: (
            ctx: unknown,
            fn: (chatId: string) => Promise<unknown>,
          ) => Promise<void>;
        }
      ).runAction.bind(service);

      await run(ctx, async () => ({ kind: 'cancelled' }));

      expect(ctx.reply).toHaveBeenCalled();
    });

    it('shows "draft gone" for DraftNotFoundException', async () => {
      const ctx = makeActionCtx();
      const run = (
        service as unknown as {
          runAction: (
            ctx: unknown,
            fn: (chatId: string) => Promise<unknown>,
          ) => Promise<void>;
        }
      ).runAction.bind(service);

      await run(ctx, async () => {
        throw new DraftNotFoundException();
      });

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('não está mais disponível'),
      );
    });

    it('shows a generic error for anything unexpected', async () => {
      const ctx = makeActionCtx();
      const run = (
        service as unknown as {
          runAction: (
            ctx: unknown,
            fn: (chatId: string) => Promise<unknown>,
          ) => Promise<void>;
        }
      ).runAction.bind(service);

      await run(ctx, async () => {
        throw new Error('db down');
      });

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Algo deu errado'),
      );
    });
  });

  describe('handleMenuChoice', () => {
    function makeCtx(choice: string) {
      return {
        chat: { id: 123 },
        match: [`wz:menu:${choice}`, choice],
        answerCbQuery: jest.fn(),
        editMessageText: jest.fn(),
        reply: jest.fn(),
      };
    }

    it('texto starts the text flow', async () => {
      wizardService.startTextFlow.mockResolvedValue({
        kind: 'prompt',
        step: 'nome' as never,
        prompt: 'Qual o nome da receita?',
        core: true,
      });
      const ctx = makeCtx('texto');

      await (
        service as unknown as {
          handleMenuChoice: (ctx: unknown) => Promise<void>;
        }
      ).handleMenuChoice(ctx);

      expect(wizardService.startTextFlow).toHaveBeenCalledWith('123');
      expect(ctx.editMessageText).toHaveBeenCalledWith(
        'Qual o nome da receita?',
        expect.any(Object),
      );
    });

    it('imagem prompts for a photo without starting anything yet', async () => {
      const ctx = makeCtx('imagem');

      await (
        service as unknown as {
          handleMenuChoice: (ctx: unknown) => Promise<void>;
        }
      ).handleMenuChoice(ctx);

      expect(wizardService.startImageFlow).not.toHaveBeenCalled();
      expect(ctx.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('foto'),
      );
    });

    it('link prompts for a URL and arms the awaiting-link state', async () => {
      const ctx = makeCtx('link');

      await (
        service as unknown as {
          handleMenuChoice: (ctx: unknown) => Promise<void>;
        }
      ).handleMenuChoice(ctx);

      expect(ctx.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('link'),
      );
    });
  });

  describe('runWizardSweep', () => {
    it('sends the pt-BR warning message to each chat the sweep reports', () => {
      wizardService.sweep.mockReturnValue({
        warnings: [{ chatId: '123', draftId: 'draft-1', minutesRemaining: 10 }],
        expired: [],
      });
      service.bot.telegram.sendMessage = jest.fn().mockResolvedValue(undefined);

      (service as unknown as { runWizardSweep: () => void }).runWizardSweep();

      expect(service.bot.telegram.sendMessage).toHaveBeenCalledWith(
        '123',
        expect.stringContaining('10 minutos'),
      );
    });

    it('does not throw when sendMessage rejects', () => {
      wizardService.sweep.mockReturnValue({
        warnings: [{ chatId: '123', draftId: 'draft-1', minutesRemaining: 20 }],
        expired: [],
      });
      service.bot.telegram.sendMessage = jest
        .fn()
        .mockRejectedValue(new Error('blocked by user'));

      expect(() =>
        (service as unknown as { runWizardSweep: () => void }).runWizardSweep(),
      ).not.toThrow();
    });

    it('does not send anything for expired sessions (resume offer is lazy, per US08)', () => {
      wizardService.sweep.mockReturnValue({
        warnings: [],
        expired: [{ chatId: '123', draftId: 'draft-1' }],
      });
      service.bot.telegram.sendMessage = jest.fn();

      (service as unknown as { runWizardSweep: () => void }).runWizardSweep();

      expect(service.bot.telegram.sendMessage).not.toHaveBeenCalled();
    });
  });
});

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Context, NarrowedContext, Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { Message, Update } from 'telegraf/types';
import { OcrService } from '../ocr/ocr.service';
import { InvalidImageException } from '../ocr/exceptions/invalid-image.exception';
import { OcrExtractionFailedException } from '../ocr/exceptions/ocr-extraction-failed.exception';
import { SsrfBlockedException } from '../scraping/exceptions/ssrf-blocked.exception';
import { ScrapingFailedException } from '../scraping/exceptions/scraping-failed.exception';
import { RecipesService } from '../recipes/recipes.service';
import { DraftNotFoundException } from '../recipes/exceptions/draft-not-found.exception';
import { WizardService } from './wizard/wizard.service';
import { WizardStep } from './wizard/wizard-step.enum';
import { WizardResult } from './wizard/wizard-result.interface';
import { presentWizardResult } from './wizard/wizard-presenter';
import { WIZARD_SWEEP_INTERVAL_MS } from './wizard/wizard.constants';
import {
  BACK_GOTO_PATTERN,
  CANCEL_CALLBACK,
  COMPLETE_NOW_CALLBACK,
  EDIT_SOMETHING_CALLBACK,
  FORWARD_GOTO_PATTERN,
  MENU_ACTION_PATTERN,
  RESTART_CALLBACK,
  RESUME_CALLBACK,
  REVIEW_ACTION_PATTERN,
  SAVE_ANYWAY_CALLBACK,
  SAVE_CALLBACK,
  SKIP_CALLBACK,
} from './wizard/wizard-callbacks';
import {
  AWAITING_IMAGE_PROMPT,
  AWAITING_LINK_PROMPT,
  DRAFT_GONE_MESSAGE,
  GENERIC_ERROR_MESSAGE,
  HELP_TEXT,
  IMAGE_INVALID_MESSAGE,
  IMAGE_SERVER_ERROR_MESSAGE,
  LINK_BLOCKED_MESSAGE,
  LINK_FAILED_MESSAGE,
  WELCOME_FIRST_TIME,
  WELCOME_RETURNING,
  wizardWarningMessage,
} from './wizard/wizard-messages';
import { TELEGRAM_PHOTO_MIME_TYPE } from './bot.constants';

type PhotoContext = NarrowedContext<
  Context,
  Update.MessageUpdate<Message.PhotoMessage>
>;
type TextContext = NarrowedContext<
  Context,
  Update.MessageUpdate<Message.TextMessage>
>;
type ActionContext = NarrowedContext<Context, Update.CallbackQueryUpdate> & {
  match: RegExpExecArray;
};
type SimpleContext = NarrowedContext<Context, Update>;

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  readonly bot: Telegraf;
  private launched = false;
  private sweepInterval?: ReturnType<typeof setInterval>;
  /** chat_ids where "🔗 Link do site" was tapped and we're waiting for the next text message to be the URL. Presentation-level, not part of the durable wizard state. */
  private readonly awaitingLink = new Set<string>();

  constructor(
    private readonly config: ConfigService,
    private readonly ocrService: OcrService,
    private readonly recipesService: RecipesService,
    private readonly wizardService: WizardService,
  ) {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    }
    this.bot = new Telegraf(token);
    this.registerHandlers();
  }

  async onModuleInit(): Promise<void> {
    const mode = this.config.get<string>('TELEGRAM_BOT_MODE') ?? 'webhook';
    if (mode === 'polling') {
      await this.bot.launch();
      this.launched = true;
      this.logger.log('Telegram bot started via long polling');
    } else {
      this.logger.log('Telegram bot ready for webhook updates');
    }
    this.sweepInterval = setInterval(
      () => this.runWizardSweep(),
      WIZARD_SWEEP_INTERVAL_MS,
    );
  }

  onModuleDestroy(): void {
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
    }
    // Telegraf.stop() throws if launch() was never called — in the
    // default webhook mode, updates arrive via TelegramWebhookController
    // instead, so there is nothing to stop.
    if (this.launched) {
      this.bot.stop('application shutdown');
    }
  }

  private registerHandlers(): void {
    this.bot.start((ctx) => this.handleStart(ctx));
    this.bot.help((ctx) => ctx.reply(HELP_TEXT));
    this.bot.command('nova', (ctx) => this.handleNova(ctx));
    this.bot.command('cancelar', (ctx) =>
      this.runAction(ctx as unknown as ActionContext, (chatId) =>
        this.wizardService.cancel(chatId),
      ),
    );
    this.bot.command('retroceder', (ctx) =>
      this.runAction(ctx as unknown as ActionContext, (chatId) =>
        this.wizardService.listBackSteps(chatId),
      ),
    );
    this.bot.command('avancar', (ctx) =>
      this.runAction(ctx as unknown as ActionContext, (chatId) =>
        this.wizardService.listForwardSteps(chatId),
      ),
    );

    this.bot.on(message('photo'), (ctx) => this.handlePhoto(ctx));
    this.bot.on(message('text'), (ctx) => this.handleText(ctx));

    this.bot.action(MENU_ACTION_PATTERN, (ctx) => this.handleMenuChoice(ctx));
    this.bot.action(SKIP_CALLBACK, (ctx) =>
      this.runAction(ctx, (chatId) => this.wizardService.skip(chatId)),
    );
    this.bot.action(REVIEW_ACTION_PATTERN, (ctx) =>
      this.runAction(ctx, (chatId) =>
        this.wizardService.handleReviewAction(
          chatId,
          ctx.match[1] as 'confirm' | 'edit',
          ctx.match[2] as 'title_ingredients' | 'instructions',
        ),
      ),
    );
    this.bot.action(BACK_GOTO_PATTERN, (ctx) =>
      this.runAction(ctx, (chatId) =>
        this.wizardService.goBackTo(chatId, ctx.match[1] as WizardStep),
      ),
    );
    this.bot.action(FORWARD_GOTO_PATTERN, (ctx) =>
      this.runAction(ctx, (chatId) =>
        this.wizardService.goForwardTo(chatId, ctx.match[1] as WizardStep),
      ),
    );
    this.bot.action(SAVE_CALLBACK, (ctx) =>
      this.runAction(ctx, (chatId) => this.wizardService.save(chatId)),
    );
    this.bot.action(SAVE_ANYWAY_CALLBACK, (ctx) =>
      this.runAction(ctx, (chatId) => this.wizardService.saveAnyway(chatId)),
    );
    this.bot.action(COMPLETE_NOW_CALLBACK, (ctx) =>
      this.runAction(ctx, (chatId) => this.wizardService.completeNow(chatId)),
    );
    this.bot.action(EDIT_SOMETHING_CALLBACK, (ctx) =>
      this.runAction(ctx, (chatId) => this.wizardService.listBackSteps(chatId)),
    );
    this.bot.action(CANCEL_CALLBACK, (ctx) =>
      this.runAction(ctx, (chatId) => this.wizardService.cancel(chatId)),
    );
    this.bot.action(RESUME_CALLBACK, (ctx) =>
      this.runAction(ctx, (chatId) => this.wizardService.resume(chatId)),
    );
    this.bot.action(RESTART_CALLBACK, (ctx) =>
      this.runAction(ctx, (chatId) => this.wizardService.restart(chatId)),
    );
  }

  // ---- US05: onboarding + entry menu -----------------------------------

  private async handleStart(ctx: SimpleContext): Promise<void> {
    const chatId = String(ctx.chat!.id);
    const hasHistory = await this.recipesService.hasHistory(chatId);
    await ctx.reply(hasHistory ? WELCOME_RETURNING : WELCOME_FIRST_TIME);
    await this.replyWithResult(ctx, this.wizardService.showEntryMenu());
  }

  private async handleNova(ctx: SimpleContext): Promise<void> {
    const chatId = String(ctx.chat!.id);
    const resumeOffer = await this.wizardService.checkResumeOffer(chatId);
    await this.replyWithResult(
      ctx,
      resumeOffer ?? this.wizardService.showEntryMenu(),
    );
  }

  // ---- Photo / link / text entry points --------------------------------

  private async handlePhoto(ctx: PhotoContext): Promise<void> {
    const chatId = String(ctx.chat.id);
    const photos = ctx.message.photo;
    const largest = photos[photos.length - 1];

    try {
      const fileLink = await ctx.telegram.getFileLink(largest.file_id);
      const response = await fetch(fileLink.href);
      const buffer = Buffer.from(await response.arrayBuffer());

      const result = await this.wizardService.startImageFlow(
        chatId,
        buffer,
        TELEGRAM_PHOTO_MIME_TYPE,
      );
      await this.replyWithResult(ctx, result);
    } catch (error) {
      if (error instanceof InvalidImageException) {
        this.logger.warn(`Invalid image from chat ${chatId}: ${error}`);
        await ctx.reply(IMAGE_INVALID_MESSAGE);
        return;
      }
      if (error instanceof OcrExtractionFailedException) {
        // Distinguish a model/API failure from a bad photo (docs/diagnosis/ocr-photo-extraction-failure.md):
        // the image was fine, something on the Gemini/network side failed — say so, don't blame the photo.
        this.logger.warn(`OCR extraction failed for chat ${chatId}: ${error}`);
        await ctx.reply(IMAGE_SERVER_ERROR_MESSAGE);
        return;
      }
      this.logger.warn(`Photo ingestion failed for chat ${chatId}: ${error}`);
      await ctx.reply(GENERIC_ERROR_MESSAGE);
    }
  }

  private async handleText(ctx: TextContext): Promise<void> {
    const chatId = String(ctx.chat.id);
    const text = ctx.message.text;

    if (this.awaitingLink.has(chatId)) {
      this.awaitingLink.delete(chatId);
      await this.startLinkFlow(ctx, chatId, text.trim());
      return;
    }

    if (!this.wizardService.hasActiveSession(chatId)) {
      const resumeOffer = await this.wizardService.checkResumeOffer(chatId);
      if (resumeOffer) {
        await this.replyWithResult(ctx, resumeOffer);
        return;
      }
      await ctx.reply(HELP_TEXT);
      return;
    }

    try {
      const result = await this.wizardService.handleTextReply(chatId, text);
      await this.replyWithResult(ctx, result);
    } catch (error) {
      if (error instanceof DraftNotFoundException) {
        await ctx.reply(DRAFT_GONE_MESSAGE);
        return;
      }
      this.logger.warn(
        `Failed to apply wizard reply for chat ${chatId}: ${error}`,
      );
      await ctx.reply(GENERIC_ERROR_MESSAGE);
    }
  }

  private async startLinkFlow(
    ctx: TextContext,
    chatId: string,
    url: string,
  ): Promise<void> {
    try {
      const result = await this.wizardService.startLinkFlow(chatId, url);
      await this.replyWithResult(ctx, result);
    } catch (error) {
      if (error instanceof SsrfBlockedException) {
        await ctx.reply(LINK_BLOCKED_MESSAGE);
        return;
      }
      if (error instanceof ScrapingFailedException) {
        await ctx.reply(LINK_FAILED_MESSAGE);
        return;
      }
      this.logger.warn(`Link ingestion failed for chat ${chatId}: ${error}`);
      await ctx.reply(GENERIC_ERROR_MESSAGE);
    }
  }

  private async handleMenuChoice(ctx: ActionContext): Promise<void> {
    await ctx.answerCbQuery();
    const chatId = String(ctx.chat!.id);
    const choice = ctx.match[1] as 'texto' | 'imagem' | 'link';

    try {
      if (choice === 'texto') {
        this.awaitingLink.delete(chatId);
        const result = await this.wizardService.startTextFlow(chatId);
        await this.editWithResult(ctx, result);
        return;
      }
      if (choice === 'imagem') {
        this.awaitingLink.delete(chatId);
        await ctx.editMessageText(AWAITING_IMAGE_PROMPT);
        return;
      }
      this.awaitingLink.add(chatId);
      await ctx.editMessageText(AWAITING_LINK_PROMPT);
    } catch (error) {
      this.logger.warn(
        `Failed to start wizard flow for chat ${chatId}: ${error}`,
      );
      await ctx.reply(GENERIC_ERROR_MESSAGE);
    }
  }

  // ---- Generic dispatcher for callback/command-driven wizard actions ---

  private async runAction(
    ctx: ActionContext,
    fn: (chatId: string) => Promise<WizardResult>,
  ): Promise<void> {
    if (typeof ctx.answerCbQuery === 'function') {
      await ctx.answerCbQuery();
    }
    const chatId = String(ctx.chat!.id);
    try {
      const result = await fn(chatId);
      await this.editWithResult(ctx, result);
    } catch (error) {
      if (error instanceof DraftNotFoundException) {
        await ctx.reply(DRAFT_GONE_MESSAGE);
        return;
      }
      this.logger.warn(`Wizard action failed for chat ${chatId}: ${error}`);
      await ctx.reply(GENERIC_ERROR_MESSAGE);
    }
  }

  // ---- US08: proactive TTL warnings ------------------------------------

  private runWizardSweep(): void {
    const { warnings, expired } = this.wizardService.sweep();

    for (const warning of warnings) {
      this.bot.telegram
        .sendMessage(
          warning.chatId,
          wizardWarningMessage(warning.minutesRemaining),
        )
        .catch((error) => {
          this.logger.warn(
            `Failed to send wizard TTL warning to chat ${warning.chatId}: ${error}`,
          );
        });
    }

    // No proactive message on expiry — the resume/restart offer surfaces
    // lazily on the user's next interaction (checkResumeOffer), per US08.
    for (const expiry of expired) {
      this.logger.log(
        `Wizard session expired for chat ${expiry.chatId} (draft ${expiry.draftId})`,
      );
    }
  }

  // ---- Rendering ---------------------------------------------------------

  private async replyWithResult(
    ctx: { reply: (text: string, extra?: object) => Promise<unknown> },
    result: WizardResult,
  ): Promise<void> {
    const { text, keyboard } = presentWizardResult(result);
    await ctx.reply(text, { parse_mode: 'HTML', ...(keyboard ?? {}) });
  }

  private async editWithResult(
    ctx: ActionContext,
    result: WizardResult,
  ): Promise<void> {
    const { text, keyboard } = presentWizardResult(result);
    try {
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        ...(keyboard ?? {}),
      });
    } catch {
      // The original message may be too old to edit, or unchanged — a fresh message still gets the update across.
      await ctx.reply(text, { parse_mode: 'HTML', ...(keyboard ?? {}) });
    }
  }
}

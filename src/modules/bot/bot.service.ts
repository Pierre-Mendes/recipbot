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
import { RecipesService } from '../recipes/recipes.service';
import {
  EditableDraftField,
  EDITABLE_DRAFT_FIELDS,
} from '../recipes/editable-draft-field';
import { DraftNotFoundException } from '../recipes/exceptions/draft-not-found.exception';
import { DraftValidationException } from '../recipes/exceptions/draft-validation.exception';
import { EditSessionStore } from './session/edit-session.store';
import { buildDraftPreviewKeyboard } from './keyboards/draft-preview.keyboard';
import { formatDraftPreview } from './formatters/draft-preview.formatter';
import { FIELD_PROMPTS } from './field-prompts';
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

const WELCOME_TEXT =
  "Send me a photo of a recipe and I'll pull out the title, ingredients, and steps for you to review before saving.";
const HELP_TEXT =
  'Send a photo of a recipe to start. Use the buttons under the preview to edit fields, confirm, or discard it.';

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  readonly bot: Telegraf;

  constructor(
    private readonly config: ConfigService,
    private readonly ocrService: OcrService,
    private readonly recipesService: RecipesService,
    private readonly editSessions: EditSessionStore,
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
      this.logger.log('Telegram bot started via long polling');
    } else {
      this.logger.log('Telegram bot ready for webhook updates');
    }
  }

  onModuleDestroy(): void {
    this.bot.stop('application shutdown');
  }

  private registerHandlers(): void {
    this.bot.start((ctx) => ctx.reply(WELCOME_TEXT));
    this.bot.help((ctx) => ctx.reply(HELP_TEXT));

    this.bot.on(message('photo'), (ctx) => this.handlePhoto(ctx));
    this.bot.on(message('text'), (ctx) => this.handleText(ctx));

    this.bot.action(/^confirm:(.+)$/, (ctx) => this.handleConfirm(ctx));
    this.bot.action(/^reject:(.+)$/, (ctx) => this.handleReject(ctx));
    this.bot.action(
      new RegExp(`^edit:(${EDITABLE_DRAFT_FIELDS.join('|')}):(.+)$`),
      (ctx) => this.handleEditPrompt(ctx),
    );
  }

  private async handlePhoto(ctx: PhotoContext): Promise<void> {
    const chatId = String(ctx.chat.id);
    const photos = ctx.message.photo;
    const largest = photos[photos.length - 1];

    try {
      const fileLink = await ctx.telegram.getFileLink(largest.file_id);
      const response = await fetch(fileLink.href);
      const buffer = Buffer.from(await response.arrayBuffer());

      const extraction = await this.ocrService.extractRecipeFromImage(
        buffer,
        TELEGRAM_PHOTO_MIME_TYPE,
      );
      const draft = await this.recipesService.createDraftFromExtraction(
        chatId,
        extraction,
      );

      await ctx.reply(formatDraftPreview(draft), {
        parse_mode: 'HTML',
        ...buildDraftPreviewKeyboard(draft.id),
      });
    } catch (error) {
      this.logger.warn(`Photo ingestion failed for chat ${chatId}: ${error}`);
      await ctx.reply(
        "I couldn't read that photo. Please try again with a clearer image.",
      );
    }
  }

  private async handleText(ctx: TextContext): Promise<void> {
    const chatId = String(ctx.chat.id);
    const text = ctx.message.text;

    const pending = this.editSessions.consume(chatId);
    if (!pending) {
      await ctx.reply(WELCOME_TEXT);
      return;
    }

    try {
      const draft = await this.recipesService.updateDraftField(
        chatId,
        pending.draftId,
        pending.field,
        text,
      );
      await ctx.reply(formatDraftPreview(draft), {
        parse_mode: 'HTML',
        ...buildDraftPreviewKeyboard(draft.id),
      });
    } catch (error) {
      if (error instanceof DraftValidationException) {
        // Re-arm so the user can just send a corrected value.
        this.editSessions.start(chatId, pending.draftId, pending.field);
        await ctx.reply(
          `That didn't work: ${error.message}\n\n${FIELD_PROMPTS[pending.field]}`,
        );
        return;
      }
      if (error instanceof DraftNotFoundException) {
        await ctx.reply('This draft is no longer available.');
        return;
      }
      this.logger.warn(
        `Failed to apply draft edit for chat ${chatId}: ${error}`,
      );
      await ctx.reply(
        'Something went wrong applying that edit. Please try again.',
      );
    }
  }

  private async handleConfirm(ctx: ActionContext): Promise<void> {
    await ctx.answerCbQuery();
    const chatId = String(ctx.chat!.id);
    const draftId = ctx.match[1];

    try {
      const recipe = await this.recipesService.confirmDraft(chatId, draftId);
      await ctx.editMessageText(
        `✅ Saved <b>${escapeHtml(recipe.title)}</b>!`,
        {
          parse_mode: 'HTML',
        },
      );
    } catch (error) {
      if (error instanceof DraftValidationException) {
        await ctx.reply(`Can't save yet: ${error.message}`);
        return;
      }
      if (error instanceof DraftNotFoundException) {
        await ctx.reply('This draft is no longer available.');
        return;
      }
      this.logger.warn(
        `Failed to confirm draft ${draftId} for chat ${chatId}: ${error}`,
      );
      await ctx.reply(
        'Something went wrong saving that recipe. Please try again.',
      );
    }
  }

  private async handleReject(ctx: ActionContext): Promise<void> {
    await ctx.answerCbQuery();
    const chatId = String(ctx.chat!.id);
    const draftId = ctx.match[1];

    try {
      await this.recipesService.rejectDraft(chatId, draftId);
      await ctx.editMessageText('❌ Draft discarded.');
    } catch (error) {
      if (error instanceof DraftNotFoundException) {
        await ctx.reply('This draft is no longer available.');
        return;
      }
      throw error;
    }
  }

  private async handleEditPrompt(ctx: ActionContext): Promise<void> {
    await ctx.answerCbQuery();
    const chatId = String(ctx.chat!.id);
    const field = ctx.match[1] as EditableDraftField;
    const draftId = ctx.match[2];

    try {
      await this.recipesService.getDraft(chatId, draftId);
    } catch (error) {
      if (error instanceof DraftNotFoundException) {
        await ctx.reply('This draft is no longer available.');
        return;
      }
      throw error;
    }

    this.editSessions.start(chatId, draftId, field);
    await ctx.reply(FIELD_PROMPTS[field]);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { Update } from 'telegraf/types';
import { secureCompare } from '../../common/security/secure-compare.util';
import { BotService } from './bot.service';

@Controller('telegram')
export class TelegramWebhookController {
  constructor(
    private readonly botService: BotService,
    private readonly config: ConfigService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Headers('x-telegram-bot-api-secret-token')
    secretHeader: string | undefined,
    @Body() update: Update,
    @Res() res: Response,
  ): Promise<void> {
    const expectedSecret = this.config.get<string>('TELEGRAM_WEBHOOK_SECRET');
    if (
      !expectedSecret ||
      !secretHeader ||
      !secureCompare(secretHeader, expectedSecret)
    ) {
      throw new UnauthorizedException('invalid webhook secret');
    }

    await this.botService.bot.handleUpdate(update, res);
  }
}

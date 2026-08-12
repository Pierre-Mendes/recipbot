import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OcrModule } from '../ocr/ocr.module';
import { RecipesModule } from '../recipes/recipes.module';
import { BotService } from './bot.service';
import { EditSessionStore } from './session/edit-session.store';
import { TelegramWebhookController } from './telegram-webhook.controller';

@Module({
  imports: [ConfigModule, OcrModule, RecipesModule],
  controllers: [TelegramWebhookController],
  providers: [BotService, EditSessionStore],
})
export class BotModule {}

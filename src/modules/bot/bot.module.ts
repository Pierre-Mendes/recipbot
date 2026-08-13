import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OcrModule } from '../ocr/ocr.module';
import { ScrapingModule } from '../scraping/scraping.module';
import { RecipesModule } from '../recipes/recipes.module';
import { BotService } from './bot.service';
import { WizardCacheService } from './wizard/wizard-cache.service';
import { WizardService } from './wizard/wizard.service';
import { TelegramWebhookController } from './telegram-webhook.controller';

@Module({
  imports: [ConfigModule, OcrModule, ScrapingModule, RecipesModule],
  controllers: [TelegramWebhookController],
  providers: [BotService, WizardCacheService, WizardService],
})
export class BotModule {}

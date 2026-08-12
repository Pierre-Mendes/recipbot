import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './common/database/database.module';
import { OcrModule } from './modules/ocr/ocr.module';
import { ScrapingModule } from './modules/scraping/scraping.module';
import { RagModule } from './modules/rag/rag.module';
import { RecipesModule } from './modules/recipes/recipes.module';
import { BotModule } from './modules/bot/bot.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    OcrModule,
    ScrapingModule,
    RagModule,
    RecipesModule,
    BotModule,
  ],
})
export class AppModule {}

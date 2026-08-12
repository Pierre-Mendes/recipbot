import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './common/database/database.module';
import { OcrModule } from './modules/ocr/ocr.module';
import { ScrapingModule } from './modules/scraping/scraping.module';
import { RagModule } from './modules/rag/rag.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    OcrModule,
    ScrapingModule,
    RagModule,
  ],
})
export class AppModule {}

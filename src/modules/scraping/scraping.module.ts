import { Module } from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import { SsrfGuardService } from './ssrf-guard.service';

@Module({
  providers: [ScrapingService, SsrfGuardService],
  exports: [ScrapingService],
})
export class ScrapingModule {}

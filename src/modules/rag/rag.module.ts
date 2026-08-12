import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmbeddingService } from './embedding.service';
import { RecipeSearchRepository } from './recipe-search.repository';
import { HybridSearchService } from './hybrid-search.service';

@Module({
  imports: [ConfigModule],
  providers: [EmbeddingService, RecipeSearchRepository, HybridSearchService],
  exports: [EmbeddingService, RecipeSearchRepository, HybridSearchService],
})
export class RagModule {}

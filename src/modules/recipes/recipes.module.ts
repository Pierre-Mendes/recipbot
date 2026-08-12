import { Module } from '@nestjs/common';
import { RagModule } from '../rag/rag.module';
import { DraftsRepository } from './drafts.repository';
import { RecipesRepository } from './recipes.repository';
import { RecipesService } from './recipes.service';

@Module({
  imports: [RagModule],
  providers: [DraftsRepository, RecipesRepository, RecipesService],
  exports: [RecipesService],
})
export class RecipesModule {}

import { EMBEDDING_DIMENSIONS } from './rag.constants';

/**
 * node-postgres has no built-in serializer for pgvector's `vector` type —
 * a plain JS array param would be sent as a Postgres array literal
 * (`{1,2}`), which `::vector` cannot parse. It needs the bracketed
 * `[1,2]` text format instead.
 */
export function toPgVectorLiteral(embedding: readonly number[]): string {
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `embedding must have exactly ${EMBEDDING_DIMENSIONS} dimensions, got ${embedding.length}`,
    );
  }
  if (embedding.some((value) => !Number.isFinite(value))) {
    throw new Error('embedding must contain only finite numbers');
  }
  return `[${embedding.join(',')}]`;
}

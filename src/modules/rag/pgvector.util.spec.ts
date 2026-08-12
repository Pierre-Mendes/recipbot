import { toPgVectorLiteral } from './pgvector.util';
import { EMBEDDING_DIMENSIONS } from './rag.constants';

describe('toPgVectorLiteral', () => {
  it('formats a valid embedding as a bracketed pgvector literal', () => {
    const embedding = Array.from(
      { length: EMBEDDING_DIMENSIONS },
      (_, i) => i * 0.1,
    );
    expect(toPgVectorLiteral(embedding)).toBe(`[${embedding.join(',')}]`);
  });

  it('rejects an embedding with the wrong dimensionality', () => {
    expect(() => toPgVectorLiteral([1, 2, 3])).toThrow(
      `embedding must have exactly ${EMBEDDING_DIMENSIONS} dimensions, got 3`,
    );
  });

  it('rejects an embedding containing non-finite values', () => {
    const embedding = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);
    embedding[10] = NaN;
    expect(() => toPgVectorLiteral(embedding)).toThrow(
      'embedding must contain only finite numbers',
    );

    const withInfinity = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);
    withInfinity[0] = Infinity;
    expect(() => toPgVectorLiteral(withInfinity)).toThrow(
      'embedding must contain only finite numbers',
    );
  });
});

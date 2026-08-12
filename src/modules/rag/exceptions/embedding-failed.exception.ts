import { BadGatewayException } from '@nestjs/common';

export class EmbeddingFailedException extends BadGatewayException {
  constructor(reason: string) {
    super(`Embedding request failed: ${reason}`);
  }
}

import { BadGatewayException } from '@nestjs/common';

export class ScrapingFailedException extends BadGatewayException {
  constructor(reason: string) {
    super(`Failed to fetch recipe source: ${reason}`);
  }
}

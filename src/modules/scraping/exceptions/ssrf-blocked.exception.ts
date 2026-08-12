import { BadRequestException } from '@nestjs/common';

export class SsrfBlockedException extends BadRequestException {
  constructor(reason: string) {
    super(`Refused to fetch URL: ${reason}`);
  }
}

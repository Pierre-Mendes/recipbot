import { BadRequestException } from '@nestjs/common';

export class InvalidImageException extends BadRequestException {
  constructor(reason: string) {
    super(`Invalid image: ${reason}`);
  }
}

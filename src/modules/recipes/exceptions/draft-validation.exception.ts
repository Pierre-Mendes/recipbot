import { BadRequestException } from '@nestjs/common';

export class DraftValidationException extends BadRequestException {
  constructor(public readonly messages: string[]) {
    super(messages.join('; '));
  }
}

import { NotFoundException } from '@nestjs/common';

export class DraftNotFoundException extends NotFoundException {
  constructor() {
    super('Draft not found');
  }
}

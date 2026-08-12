import { BadGatewayException } from '@nestjs/common';

export class OcrExtractionFailedException extends BadGatewayException {
  constructor(reason: string) {
    super(`OCR extraction failed: ${reason}`);
  }
}

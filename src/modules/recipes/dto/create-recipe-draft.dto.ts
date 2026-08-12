import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  sanitizeString,
  sanitizeStringArray,
} from '../../../common/validators/sanitize.transform';
import { IsPublicHttpUrl } from '../../../common/validators/is-public-http-url.decorator';

const TELEGRAM_CHAT_ID_PATTERN = /^-?\d{1,20}$/;
const TAG_PATTERN = /^[a-z0-9-]{1,50}$/;

/**
 * Input for the human-in-the-loop draft created after OCR/scrape/LLM
 * extraction. `state` is never accepted here — it is always set server-side
 * to PENDING_CONFIRMATION so a draft can't be created pre-confirmed.
 */
export class CreateRecipeDraftDto {
  @IsString()
  @Matches(TELEGRAM_CHAT_ID_PATTERN, {
    message: 'telegram_chat_id must be a numeric Telegram chat id',
  })
  @MaxLength(100)
  telegram_chat_id!: string;

  @IsOptional()
  @IsString()
  @Transform(sanitizeString)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  @Transform(sanitizeStringArray)
  ingredients?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  @Transform(sanitizeStringArray)
  instructions?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Matches(TAG_PATTERN, { each: true })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((v) => (typeof v === 'string' ? v.toLowerCase().trim() : v))
      : value,
  )
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @IsPublicHttpUrl()
  source_url?: string;

  @IsOptional()
  @IsString()
  @Transform(sanitizeString)
  @MaxLength(20000)
  raw_extracted_text?: string;
}

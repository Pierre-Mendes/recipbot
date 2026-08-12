import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  sanitizeString,
  sanitizeStringArray,
} from '../../../common/validators/sanitize.transform';
import { IsPublicHttpUrl } from '../../../common/validators/is-public-http-url.decorator';

// Telegram chat IDs are signed 64-bit integers (negative for groups/channels).
const TELEGRAM_CHAT_ID_PATTERN = /^-?\d{1,20}$/;
// Lowercase, hyphen-separated tags only — keeps GIN index lookups predictable
// and rejects payloads trying to smuggle HTML/markup through a tag.
const TAG_PATTERN = /^[a-z0-9-]{1,50}$/;

export class CreateRecipeDto {
  @IsString()
  @Matches(TELEGRAM_CHAT_ID_PATTERN, {
    message: 'telegram_chat_id must be a numeric Telegram chat id',
  })
  @MaxLength(100)
  telegram_chat_id!: string;

  @IsString()
  @Transform(sanitizeString)
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  @Transform(sanitizeStringArray)
  ingredients!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  @Transform(sanitizeStringArray)
  instructions!: string[];

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Matches(TAG_PATTERN, { each: true })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((v) => (typeof v === 'string' ? v.toLowerCase().trim() : v))
      : value,
  )
  tags: string[] = [];

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @IsPublicHttpUrl()
  source_url?: string;
}

import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { sanitizeString } from '../../../common/validators/sanitize.transform';

const TELEGRAM_CHAT_ID_PATTERN = /^-?\d{1,20}$/;
const TAG_PATTERN = /^[a-z0-9-]{1,50}$/;

/**
 * `telegram_chat_id` is required on every read so results are always
 * scoped to the requesting chat (business rule: chat_id scoping) — a
 * recipe belonging to one chat must never leak into another chat's search.
 */
export class QueryRecipesDto {
  @IsString()
  @Matches(TELEGRAM_CHAT_ID_PATTERN, {
    message: 'telegram_chat_id must be a numeric Telegram chat id',
  })
  @MaxLength(100)
  telegram_chat_id!: string;

  @IsOptional()
  @IsString()
  @Transform(sanitizeString)
  @MaxLength(500)
  q?: string;

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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}

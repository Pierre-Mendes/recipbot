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

const TAG_PATTERN = /^[a-z0-9-]{1,50}$/;

/**
 * Partial update — telegram_chat_id is intentionally not editable here:
 * ownership of a recipe is set at creation time and must never move
 * between chats through this endpoint.
 */
export class UpdateRecipeDto {
  @IsOptional()
  @IsString()
  @Transform(sanitizeString)
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  @Transform(sanitizeStringArray)
  ingredients?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
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
}

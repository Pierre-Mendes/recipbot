import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
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
import { DraftState } from '../enums/draft-state.enum';

const TAG_PATTERN = /^[a-z0-9-]{1,50}$/;

/**
 * Covers both edits made before confirmation and the confirm/reject
 * transition itself. telegram_chat_id and raw_extracted_text are not
 * editable: ownership and provenance must not change after creation.
 */
export class UpdateRecipeDraftDto {
  @IsOptional()
  @IsEnum(DraftState)
  state?: DraftState;

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
}

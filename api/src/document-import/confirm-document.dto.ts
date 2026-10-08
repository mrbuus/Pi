import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  Equals,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
export class DocumentMappingDto {
  @IsString() @IsNotEmpty() @MaxLength(100) promptId: string;
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  choiceIds: string[];
  @IsString() @IsNotEmpty() @MaxLength(100) correctChoiceId: string;
}
export class ConfirmDocumentDto {
  @IsString() @IsNotEmpty() @MaxLength(2048) previewToken: string;
  @IsString() @IsNotEmpty() @MaxLength(100) chapterId: string;
  @IsBoolean() @Equals(true) confirmed: boolean;
  @IsBoolean() @Equals(true) warningsAcknowledged: boolean;
  @ValidateNested() @Type(() => DocumentMappingDto) mapping: DocumentMappingDto;
}

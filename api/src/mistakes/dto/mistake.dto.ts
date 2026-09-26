import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export enum MistakeReason { CALC = 'CALC', CONCEPT = 'CONCEPT', FORMULA = 'FORMULA', READING = 'READING', TIME = 'TIME', UNKNOWN = 'UNKNOWN' }
export enum MistakeStatusDto { NEW = 'NEW', RETRYING = 'RETRYING', MASTERED = 'MASTERED' }
export enum MistakeSourceDto { PRACTICE = 'PRACTICE', TEST = 'TEST' }

export class RetryMistakeDto {
  @IsNotEmpty() answer!: unknown;
}
export class UpdateMistakeDto {
  @IsOptional() @IsEnum(MistakeReason) reason?: MistakeReason;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
export class MistakeQueryDto {
  @IsOptional() @IsEnum(MistakeStatusDto) status?: MistakeStatusDto;
  @IsOptional() @IsString() @MaxLength(80) topic?: string;
  @IsOptional() @IsEnum(MistakeSourceDto) source?: MistakeSourceDto;
}

import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  registerDecorator,
  ValidateNested,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { LearningEventType } from '../../generated/prisma/enums';

const FIVE_MIN_MS = 5 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_META_JSON_LENGTH = 2000;

// Клиентийн цаг зөрөх (clock-skew) урвуулалтаас сэргийлнэ: ирээдүйд 5 минутаас
// хэтэрсэн, эсвэл 7 хоногоос хуучирсан occurredAt-ыг үл хүлээн авна.
function IsRecentTimestamp(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isRecentTimestamp',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          const time = new Date(value).getTime();
          if (Number.isNaN(time)) return false;
          const now = Date.now();
          return time <= now + FIVE_MIN_MS && time >= now - SEVEN_DAYS_MS;
        },
        defaultMessage() {
          return 'occurredAt ирээдүйд 5 минутаас хэтрэх, эсвэл 7 хоногоос хуучин байж болохгүй';
        },
      },
    });
  };
}

// meta нь клиентийн чөлөөтэй бичдэг JSON — append-only хүснэгтэд хэт том
// өгөгдөл хуримтлагдаж storage дүүрэхээс сэргийлж хэмжээг хатуу хязгаарлана.
function MaxJsonSize(maxLength: number, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'maxJsonSize',
      target: object.constructor,
      propertyName,
      constraints: [maxLength],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (value === undefined || value === null) return true;
          try {
            return (
              JSON.stringify(value).length <= (args.constraints[0] as number)
            );
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          return `meta нь ${args.constraints[0]} тэмдэгтээс хэтрэхгүй байх ёстой`;
        },
      },
    });
  };
}

export class TrackEventDto {
  @IsEnum(LearningEventType)
  type: LearningEventType;

  @IsDateString()
  @IsRecentTimestamp()
  occurredAt: string;

  @IsOptional()
  @IsString()
  problemId?: string;

  @IsOptional()
  @IsString()
  testId?: string;

  @IsOptional()
  @IsString()
  chapterId?: string;

  @IsOptional()
  @IsString()
  videoId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86_400_000)
  durationMs?: number;

  @IsOptional()
  @IsObject()
  @MaxJsonSize(MAX_META_JSON_LENGTH)
  meta?: Record<string, unknown>;
}

// sessionId нь бүлэг event-үүдийн нийтлэг холбоос (нэг landing-аас гарах
// хүртэлх урсгал) — тус бүрийг биш, бүхэл batch-ийг нэг сессионд оноодог.
export class TrackEventsDto {
  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => TrackEventDto)
  events: TrackEventDto[];
}

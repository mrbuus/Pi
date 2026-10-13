import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  Matches,
} from 'class-validator';

/** exam:<testId> · problem:<problemId> · grades:<testId>:<classId> · test-edit:<testId> */
export const PRESENCE_KEY_RE =
  /^(exam|problem|grades|test-edit):[A-Za-z0-9_-]{1,40}(:[A-Za-z0-9_-]{1,40})?$/;

export class PresenceDto {
  @ApiProperty({ type: [String], example: ['exam:cmabc123'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @Matches(PRESENCE_KEY_RE, { each: true, message: 'Буруу түлхүүр' })
  keys: string[];

  @ApiPropertyOptional({
    type: Boolean,
    description: 'true — цонхоо хаасан (жагсаалтаас хасна)',
  })
  @IsOptional()
  @IsBoolean()
  leave?: boolean;
}

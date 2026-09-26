import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class SmsSendDto {
  @ApiProperty({ type: [String] })
  to: string[];
  @ApiProperty({ type: String })
  text: string;
  @ApiPropertyOptional({ type: String })
  templateId?: string;
}

import { ApiProperty } from '@nestjs/swagger';
export class SmsTemplateDto {
  @ApiProperty({ type: String })
  name: string;
  @ApiProperty({ type: String })
  text: string;
}

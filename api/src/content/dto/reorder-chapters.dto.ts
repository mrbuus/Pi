import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString } from 'class-validator';

// Бүлэг сэдвүүдийг шинэ дараалалд оруулах — ids массивын БАЙРЛАЛ шинэ
// order (1-ээс эхэлнэ) болно.
export class ReorderChaptersDto {
  @ApiProperty({ type: [String], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids: string[];
}

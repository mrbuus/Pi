import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
  IsBoolean,
} from 'class-validator';

export class PurchaseDto {
  @ApiProperty({ type: String })
  @IsString()
  productItemId: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  paymentId?: string;
}

export class CreateProductDto {
  @ApiProperty({ enum: ['TEST', 'BOOK', 'PASS'] })
  @IsIn(['TEST', 'BOOK', 'PASS'])
  kind: string;

  @ApiProperty({ type: String })
  @IsString()
  refId: string;

  @ApiProperty({ type: Number })
  @IsInt()
  @Min(0)
  @Max(2147483647)
  price: number;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  includesVideo?: boolean;
}

export class UpdatePriceDto {
  @ApiProperty({ type: Number })
  @IsInt()
  @Min(0)
  @Max(2147483647)
  price: number;
}

export class UpdateProductStatusDto {
  @ApiProperty({ type: Boolean })
  @IsBoolean()
  active: boolean;
}

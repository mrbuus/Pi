import { IsString, IsOptional, IsNumber, IsIn, IsBoolean } from 'class-validator';

export class PurchaseDto {
  @IsString()
  productItemId: string;

  @IsOptional()
  @IsString()
  paymentId?: string;
}

export class CreateProductDto {
  @IsIn(['TEST', 'BOOK', 'PASS'])
  kind: string;

  @IsString()
  refId: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsBoolean()
  includesVideo?: boolean;
}

export class UpdatePriceDto {
  @IsNumber()
  price: number;
}

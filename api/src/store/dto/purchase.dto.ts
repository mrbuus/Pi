import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';

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
}

export class UpdatePriceDto {
  @IsNumber()
  price: number;
}

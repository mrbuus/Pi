import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BankMatchStatus } from '../generated/prisma/enums';

export class ImportConfigDto {
  // Баганын зураглал: хуулгын баганын индекс → өгөгдлийн төрөл
  // Жнь: { dateCol: 0, amountCol: 2, descCol: 3, journalCol: 4, accountCol: 5 }
  @ApiProperty({ type: Number })
  dateCol: number;
  @ApiProperty({ type: Number })
  amountCol: number;
  @ApiProperty({ type: Number })
  descCol: number;
  @ApiProperty({ type: Number })
  journalCol: number;
  @ApiPropertyOptional({ type: Number })
  accountCol?: number;

  // Толгой мөрийг үлдээх эсэх (дефолт: true = эхний мөр толгой)
  @ApiPropertyOptional({ type: Boolean })
  skipHeader?: boolean;
}

export class BankTransactionResponseDto {
  @ApiProperty({ type: String })
  id: string;
  @ApiProperty({ type: String })
  bankRef: string;
  @ApiProperty({ type: String, format: 'date-time' })
  bookedAt: Date;
  @ApiProperty({ type: Number })
  amount: number;
  @ApiProperty({ type: String })
  description: string;
  @ApiProperty({ type: String, nullable: true })
  accountNo: string | null;
  @ApiProperty({ type: String, nullable: true })
  counterparty: string | null;
  @ApiProperty({ enum: BankMatchStatus })
  matchStatus: BankMatchStatus;
  @ApiProperty({ type: String, nullable: true })
  matchedUserId: string | null;
  @ApiPropertyOptional({ type: Object, additionalProperties: true, nullable: true })
  matchedUser?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
}

export class GetTransactionsQueryDto {
  @ApiPropertyOptional({ enum: BankMatchStatus })
  status?: BankMatchStatus;
  @ApiPropertyOptional({ type: Number })
  limit?: number;
  @ApiPropertyOptional({ type: Number })
  offset?: number;
}

export class ManualMatchDto {
  @ApiProperty({ type: String })
  userId: string;
}

export class ImportResultDto {
  @ApiProperty({ type: Number })
  totalRows: number;
  @ApiProperty({ type: Number })
  imported: number;
  @ApiProperty({ type: Number })
  skipped: number; // давхардсан bankRef
  @ApiProperty({ type: 'array', items: { type: 'object', properties: { rowIndex: { type: 'integer' }, bankRef: { type: 'string' }, reason: { type: 'string' } }, required: ['rowIndex', 'reason'] } })
  errors: Array<{
    rowIndex: number;
    bankRef?: string;
    reason: string;
  }>;
  @ApiProperty({ type: Number })
  matched: number; // AUTO_MATCHED хийгдсэн
}

import { BankMatchStatus } from '../generated/prisma/enums';

export class ImportConfigDto {
  // Баганын зураглал: хуулгын баганын индекс → өгөгдлийн төрөл
  // Жнь: { dateCol: 0, amountCol: 2, descCol: 3, journalCol: 4, accountCol: 5 }
  dateCol: number;
  amountCol: number;
  descCol: number;
  journalCol: number;
  accountCol?: number;

  // Толгой мөрийг үлдээх эсэх (дефолт: true = эхний мөр толгой)
  skipHeader?: boolean;
}

export class BankTransactionResponseDto {
  id: string;
  bankRef: string;
  bookedAt: Date;
  amount: number;
  description: string;
  accountNo: string | null;
  counterparty: string | null;
  matchStatus: BankMatchStatus;
  matchedUserId: string | null;
  matchedUser?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
}

export class GetTransactionsQueryDto {
  status?: BankMatchStatus;
  limit?: number;
  offset?: number;
}

export class ManualMatchDto {
  userId: string;
}

export class ImportResultDto {
  totalRows: number;
  imported: number;
  skipped: number; // давхардсан bankRef
  errors: Array<{
    rowIndex: number;
    bankRef?: string;
    reason: string;
  }>;
  matched: number; // AUTO_MATCHED хийгдсэн
}

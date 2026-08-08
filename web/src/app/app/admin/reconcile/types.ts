export type BankMatchStatus = 'UNMATCHED' | 'AUTO_MATCHED' | 'MANUALLY_MATCHED' | 'IGNORED';

export interface BankTransaction {
  id: string;
  bankRef: string;
  bookedAt: string;
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

export interface ImportConfig {
  dateCol: number;
  amountCol: number;
  descCol: number;
  journalCol: number;
  accountCol?: number;
  skipHeader?: boolean;
}

export interface ImportResult {
  totalRows: number;
  imported: number;
  skipped: number;
  errors: Array<{
    rowIndex: number;
    bankRef?: string;
    reason: string;
  }>;
  matched: number;
}

export interface TransactionListResponse {
  items: BankTransaction[];
  total: number;
}

export interface ReconcileSummary {
  total: number;
  autoMatched: number;
  manuallyMatched: number;
  unmatched: number;
}

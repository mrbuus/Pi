import { extractPhones } from './phone-extract';

export interface TransactionData {
  amount: number;
  description: string;
}

export interface StudentData {
  userId: string;
  phone?: string;
  expectedAmount?: number;
}

export interface MatchResult {
  decision: 'AUTO' | 'SUGGEST' | 'NONE';
  userId?: string;
  candidates: string[];
  reason: string;
}

/**
 * Банкны гүйлгээг сурагчтайгаа холбох логик
 *
 * AUTO: ЯГ 1 сурагч таарсан + expectedAmount байна + дүн таарна
 * SUGGEST: утас таарсан ч дүн зөрсөн, эсвэл олон сурагч таарсан
 * NONE: ямар ч утас таараагүй
 *
 * @example
 * matchTransaction(
 *   { amount: 50000, description: "Сурагч: 88112233" },
 *   [{ userId: "alice", phone: "88112233", expectedAmount: 50000 }]
 * ) → { decision: 'AUTO', userId: 'alice', candidates: ['alice'], reason: '...' }
 */
export function matchTransaction(
  tx: TransactionData,
  students: StudentData[],
): MatchResult {
  const phones = extractPhones(tx.description);

  // Утас ялгасан байхгүй
  if (phones.length === 0) {
    return {
      decision: 'NONE',
      candidates: [],
      reason: 'Гүйлгээний утгаас утаснын дугаар ялгасан байхгүй',
    };
  }

  // Таарсан сурагчдыг олно
  const matches: Array<{ userId: string; expectedAmount?: number }> = [];

  for (const student of students) {
    if (student.phone && phones.includes(student.phone)) {
      matches.push({
        userId: student.userId,
        expectedAmount: student.expectedAmount,
      });
    }
  }

  // Сурагч таараагүй
  if (matches.length === 0) {
    return {
      decision: 'NONE',
      candidates: [],
      reason: `Утас ${phones.join(', ')} сурагчтай таараагүй`,
    };
  }

  const candidates = matches.map((m) => m.userId);

  // ЯГ нэг сурагч таарсан
  if (matches.length === 1) {
    const match = matches[0];
    const matchedPhone = phones[0];

    // expectedAmount дутуу
    if (match.expectedAmount === undefined || match.expectedAmount === null) {
      return {
        decision: 'SUGGEST',
        candidates,
        reason: `Утас ${matchedPhone} дугаар ялгасан (төлбөрийн хүлээлтийн дүн тодорхойгүй)`,
      };
    }

    // Дүн таарна → AUTO
    if (tx.amount === match.expectedAmount) {
      return {
        decision: 'AUTO',
        userId: match.userId,
        candidates,
        reason: `Утас ${matchedPhone} дугаар ялгасан, төлбөрийн дүн ${tx.amount} таарсан`,
      };
    }

    // Дүн зөрсөн → SUGGEST
    return {
      decision: 'SUGGEST',
      candidates,
      reason: `Утас ${matchedPhone} дугаар ялгасан (төлбөр зөрсөн: ${tx.amount} != ${match.expectedAmount})`,
    };
  }

  // Олон сурагч таарсан
  const countWords: Record<number, string> = {
    2: 'хоёр',
    3: 'гурван',
    4: 'дөрөв',
    5: 'таван',
  };
  const countWord = countWords[matches.length] || matches.length.toString();

  return {
    decision: 'SUGGEST',
    candidates,
    reason: `Утас ${phones.join(', ')} дугаар ${countWord} сурагчтай таарсан`,
  };
}

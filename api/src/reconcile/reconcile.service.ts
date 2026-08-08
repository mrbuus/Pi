import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import * as ExcelJS from 'exceljs';
import { BankMatchStatus, PaymentStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaymentsService } from '../payments/payments.service';
import { matchTransaction } from './matcher';
import {
  ImportConfigDto,
  BankTransactionResponseDto,
  GetTransactionsQueryDto,
  ImportResultDto,
  ManualMatchDto,
} from './reconcile.dto';

interface PaymentActor {
  id: string;
  role: string;
}

@Injectable()
export class ReconcileService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private payments: PaymentsService,
  ) {}

  /**
   * Банкны хуулгаас мөр импортлоно (.xlsx эсвэл .csv)
   * 1. Excel/CSV буфферээс мөр уншина
   * 2. Толгой мөрийг автоматаар таних оролдлого (конфиг байхгүй бол)
   * 3. Мөр бүрд: bankRef давхардал АЛГАСНА, зөвхөн кредит (amount > 0) авна
   * 4. BankTransaction үүсгэнэ
   * 5. matcher ажиллуулаад AUTO_MATCHED Payment үүсгэнэ
   */
  async importFromFile(
    buffer: Buffer,
    fileType: 'xlsx' | 'csv',
    config: ImportConfigDto,
    importedById: string,
  ): Promise<ImportResultDto> {
    // ── 1. Буфферээс энгийн утгын хүснэгт болгож уншина ────────────────────
    const grid = await this.readGrid(buffer, fileType);
    if (grid.length === 0) {
      throw new BadRequestException('Хуулгад мөр байхгүй байна');
    }

    // ── 2. Хаан банкны форматыг автоматаар таньж мөрүүдийг задлана ─────────
    const parsed = this.parseKhanStatement(grid);

    const result: ImportResultDto = {
      totalRows: parsed.txs.length,
      imported: 0,
      skipped: parsed.debitOrEmpty, // дебит/хоосон мөр — импортод хамаарахгүй
      errors: [],
      matched: 0,
    };

    // Сурагчидыг ХҮҮХЭЛГҮЙД унш (гар утастай, төлбөрийн төлөвлөгөөтэй)
    const studentsRaw = await this.prisma.user.findMany({
      where: {
        studentProfile: {
          isNot: null,
        },
      },
      select: {
        id: true,
        phone: true,
        studentProfile: {
          select: {
            tuitionAmount: true,
          },
        },
      },
    });

    // Matcher-ийн StudentData формат руу transform
    const students = studentsRaw.map((s) => ({
      userId: s.id,
      phone: s.phone || undefined,
      expectedAmount: s.studentProfile?.tuitionAmount ?? undefined,
    }));

    for (let i = 0; i < parsed.txs.length; i++) {
      const tx = parsed.txs[i];
      try {
        const bankRef = tx.bankRef;

        // Идемпотент: ижил хуулгыг (эсвэл давхацсан интервалын хуулгуудыг)
        // дахин импортлоход ижил bankRef-тэй мөр АЛГАСАГДАНА
        const existing = await this.prisma.bankTransaction.findUnique({
          where: { bankRef },
        });
        if (existing) {
          result.skipped++;
          continue;
        }

        // BankTransaction үүсгэнэ
        const bankTx = await this.prisma.bankTransaction.create({
          data: {
            bankRef,
            bookedAt: tx.bookedAt,
            amount: tx.amount,
            description: tx.description,
            accountNo: null,
            counterparty: tx.counterparty,
            importedById,
            rawRow: tx.raw, // Хуулгын эх мөр — маргаан гарвал эх рүү буцаж харна
          },
        });

        result.imported++;

        // Matcher ажиллуулна
        const matchResult = matchTransaction(
          {
            amount: tx.amount,
            description: tx.description,
          },
          students,
        );

        // AUTO тулгалтаа Payment CONFIRMED үүсгэнэ
        if (matchResult.decision === 'AUTO' && matchResult.userId) {
          // AUTO бөгөөд matcher-аас user байвал Payment үүсгэлгүүлэх
          const payment = await this.prisma.payment.create({
            data: {
              userId: matchResult.userId,
              amount: bankTx.amount,
              method: 'BANK_TRANSFER',
              status: PaymentStatus.CONFIRMED,
              description: `Банкны хуулгаас автоматаар (${bankRef})`,
              paidAt: bankTx.bookedAt,
              forMonth: this.getMonthFromDate(bankTx.bookedAt),
            },
          });

          // BankTransaction-д linkage нэмнэ
          await this.prisma.bankTransaction.update({
            where: { id: bankTx.id },
            data: {
              matchedUserId: matchResult.userId,
              matchStatus: BankMatchStatus.AUTO_MATCHED,
              paymentId: payment.id,
            },
          });

          // Аудит лог
          await this.audit.record({
            actorId: importedById,
            actorRole: 'ADMIN',
            action: 'AUTO_MATCH',
            entity: 'BankTransaction',
            entityId: bankTx.id,
            after: {
              matchStatus: BankMatchStatus.AUTO_MATCHED,
              matchedUserId: matchResult.userId,
              paymentId: payment.id,
            },
          });

          result.matched++;
        }
      } catch (err) {
        result.errors.push({
          rowIndex: i + 1,
          reason: err instanceof Error ? err.message : 'Үл мэдэгдэх алдаа',
        });
      }
    }

    return result;
  }

  /**
   * Excel/CSV буфферээс ЭНГИЙН УТГЫН хүснэгт болгож уншина.
   * exceljs нь нэгтгэсэн нүд, richText обьект буцаадаг — бүгдийг мөр болгоно.
   */
  private async readGrid(
    buffer: Buffer,
    fileType: 'xlsx' | 'csv',
  ): Promise<string[][]> {
    const grid: string[][] = [];

    const cellText = (v: unknown): string => {
      if (v === null || v === undefined) return '';
      if (v instanceof Date) return v.toISOString();
      if (typeof v === 'object') {
        const o = v as { richText?: Array<{ text: string }>; result?: unknown; text?: string };
        if (o.richText) return o.richText.map((t) => t.text).join('');
        if (o.result !== undefined) return String(o.result);
        if (o.text !== undefined) return String(o.text);
      }
      return String(v);
    };

    if (fileType === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new BadRequestException('Excel файл хоосон байна');
      }
      worksheet.eachRow({ includeEmpty: false }, (row) => {
        const cells: string[] = [];
        for (let c = 1; c <= worksheet.columnCount; c++) {
          cells.push(cellText(row.getCell(c).value).trim());
        }
        grid.push(cells);
      });
    } else {
      for (const line of buffer.toString('utf-8').split('\n')) {
        if (line.trim()) grid.push(line.split(',').map((v) => v.trim()));
      }
    }
    return grid;
  }

  /**
   * Хаан банкны «Deposit Account Statement» форматыг таньж задлана.
   *
   * Бодит файлын онцлог (2026-08-08-нд эзний өгсөн жинхэнэ хуулгаас):
   *   • Эхний 7 мөр — тайлбар/нэгтгэсэн нүднүүд, толгой нь 8-р мөрд
   *   • Багана: Гүйлгээний огноо | Салбар | Эхний үлдэгдэл | Кредит гүйлгээ |
   *     Дебит гүйлгээ | Эцсийн үлдэгдэл | Гүйлгээний утга | Харьцсан данс
   *   • ЖУРНАЛЫН ДУГААР БАЙХГҮЙ — тиймээс bankRef-ийг мөрийн агуулгаас
   *     детерминистик хэшээр гаргана. «Эцсийн үлдэгдэл» хэшэд орсноор яг нэг
   *     секундэд ижил дүнтэй 2 шилжүүлэг ирсэн ч үлдэгдэл нь өөр тул ялгарна.
   *     Давхацсан интервалтай хуулгуудыг дахин импортлоход ижил мөр ижил хэш
   *     өгч идемпотент байдал хадгалагдана.
   */
  private parseKhanStatement(grid: string[][]): {
    txs: Array<{
      bankRef: string;
      bookedAt: Date;
      amount: number;
      description: string;
      counterparty: string | null;
      raw: string[];
    }>;
    debitOrEmpty: number;
  } {
    // Толгой мөрийг хайна — байрлал нь хувилбар бүрд өөр байж болно
    const headerIdx = grid.findIndex((row) =>
      row.some((c) => c === 'Гүйлгээний огноо'),
    );
    if (headerIdx < 0) {
      throw new BadRequestException(
        'Хуулгын толгой олдсонгүй — «Гүйлгээний огноо» багана бүхий ' +
          'Хаан банкны хуулга (.xlsx) байх ёстой',
      );
    }

    const header = grid[headerIdx];
    const col = (name: string) => header.findIndex((c) => c === name);
    const cDate = col('Гүйлгээний огноо');
    const cCredit = col('Кредит гүйлгээ');
    const cDesc = col('Гүйлгээний утга');
    const cCp = col('Харьцсан данс');
    const cClosing = col('Эцсийн үлдэгдэл');
    if (cDate < 0 || cCredit < 0 || cDesc < 0) {
      throw new BadRequestException(
        'Хуулгын багана дутуу: Гүйлгээний огноо / Кредит гүйлгээ / Гүйлгээний утга хэрэгтэй',
      );
    }

    const txs: ReturnType<
      ReconcileService['parseKhanStatement']
    >['txs'] = [];
    let debitOrEmpty = 0;

    for (let r = headerIdx + 1; r < grid.length; r++) {
      const row = grid[r];
      const credit = parseFloat((row[cCredit] ?? '').replace(/[^\d.-]/g, ''));
      if (!Number.isFinite(credit) || credit <= 0) {
        debitOrEmpty++;
        continue; // дебит, хоосон эсвэл нэгтгэлийн мөр
      }

      // Огноо: exceljs Date → ISO мөр болгосон, эсвэл "YYYY-MM-DD HH:mm:ss"
      // текст — сүүлийнх нь УБ цагийн бүсийнх тул +08:00-ыг ил зааж өгнө
      // (заахгүй бол серверийн бүсээр уншиж 8 цагаар зөрнө).
      const rawDate = row[cDate] ?? '';
      const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(rawDate)
        ? rawDate.replace(' ', 'T') + '+08:00'
        : rawDate;
      const bookedAt = new Date(iso);
      if (isNaN(bookedAt.getTime())) {
        debitOrEmpty++;
        continue;
      }

      const description = row[cDesc] ?? '';
      const counterparty = cCp >= 0 && row[cCp] ? row[cCp] : null;
      const closing = cClosing >= 0 ? (row[cClosing] ?? '') : '';

      const bankRef =
        'KHAN-' +
        createHash('sha256')
          .update(
            [bookedAt.toISOString(), credit, description, counterparty ?? '', closing].join('|'),
          )
          .digest('hex')
          .slice(0, 20);

      txs.push({
        bankRef,
        bookedAt,
        amount: Math.round(credit),
        description,
        counterparty,
        raw: row,
      });
    }

    return { txs, debitOrEmpty };
  }

  /**
   * Банкны гүйлгээнүүдийг жагсаалтлана
   */
  async getTransactions(
    query: GetTransactionsQueryDto,
  ): Promise<{ items: BankTransactionResponseDto[]; total: number }> {
    const { status, limit = 50, offset = 0 } = query;

    const where: any = {};
    if (status) {
      where.matchStatus = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.bankTransaction.findMany({
        where,
        include: {
          matchedUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
        orderBy: { bookedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.bankTransaction.count({ where }),
    ]);

    return {
      items: items.map((tx) => ({
        id: tx.id,
        bankRef: tx.bankRef,
        bookedAt: tx.bookedAt,
        amount: tx.amount,
        description: tx.description,
        accountNo: tx.accountNo,
        counterparty: tx.counterparty,
        matchStatus: tx.matchStatus,
        matchedUserId: tx.matchedUserId,
        matchedUser: tx.matchedUser
          ? {
              id: tx.matchedUser.id,
              firstName: tx.matchedUser.firstName,
              lastName: tx.matchedUser.lastName,
              phone: tx.matchedUser.phone || '',
            }
          : null,
      })),
      total,
    };
  }

  /**
   * Гараар тулгалтаа Payment PENDING үүсгэлгүүлэх (админ дараа баталгаажуулна)
   */
  async manualMatch(
    bankTransactionId: string,
    dto: ManualMatchDto,
    actor: PaymentActor,
  ): Promise<BankTransactionResponseDto> {
    const bankTx = await this.prisma.bankTransaction.findUnique({
      where: { id: bankTransactionId },
      include: {
        matchedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    if (!bankTx) {
      throw new NotFoundException('Банкны гүйлгээ олдсонгүй');
    }

    if (bankTx.matchStatus !== BankMatchStatus.UNMATCHED) {
      throw new BadRequestException(
        `Гүйлгээ ${bankTx.matchStatus} статустай байна. Гараар тулгалт хийх боломжгүй`,
      );
    }

    // Сурагч байгаа эсэх шалгана
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, firstName: true, lastName: true, phone: true },
    });

    if (!user) {
      throw new NotFoundException('Сурагч олдсонгүй');
    }

    // PENDING Payment үүсгэнэ (админ дараа CONFIRMED болно)
    const payment = await this.prisma.payment.create({
      data: {
        userId: dto.userId,
        amount: bankTx.amount,
        method: 'BANK_TRANSFER',
        status: PaymentStatus.PENDING,
        description: `Админ гараар холбосон (${bankTx.bankRef})`,
        forMonth: this.getMonthFromDate(bankTx.bookedAt),
      },
    });

    // BankTransaction-д linkage
    const updated = await this.prisma.bankTransaction.update({
      where: { id: bankTransactionId },
      data: {
        matchedUserId: dto.userId,
        matchStatus: BankMatchStatus.MANUAL_MATCHED,
        paymentId: payment.id,
      },
      include: {
        matchedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    // Аудит лог
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'MANUAL_MATCH',
      entity: 'BankTransaction',
      entityId: bankTransactionId,
      after: {
        matchStatus: BankMatchStatus.MANUAL_MATCHED,
        matchedUserId: dto.userId,
        paymentId: payment.id,
      },
    });

    return {
      id: updated.id,
      bankRef: updated.bankRef,
      bookedAt: updated.bookedAt,
      amount: updated.amount,
      description: updated.description,
      accountNo: updated.accountNo,
      counterparty: updated.counterparty,
      matchStatus: updated.matchStatus,
      matchedUserId: updated.matchedUserId,
      matchedUser: updated.matchedUser
        ? {
            id: updated.matchedUser.id,
            firstName: updated.matchedUser.firstName,
            lastName: updated.matchedUser.lastName,
            phone: updated.matchedUser.phone || '',
          }
        : null,
    };
  }

  /**
   * Гүйлгээг үл анхааралтай үл үзэх (IGNORED)
   */
  async ignoreTransaction(
    bankTransactionId: string,
    actor: PaymentActor,
  ): Promise<BankTransactionResponseDto> {
    const bankTx = await this.prisma.bankTransaction.findUnique({
      where: { id: bankTransactionId },
      include: {
        matchedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    if (!bankTx) {
      throw new NotFoundException('Банкны гүйлгээ олдсонгүй');
    }

    if (bankTx.matchStatus !== BankMatchStatus.UNMATCHED) {
      throw new BadRequestException(
        `Гүйлгээ ${bankTx.matchStatus} статустай байна. Үл анхааралтай үл үзэх боломжгүй`,
      );
    }

    const updated = await this.prisma.bankTransaction.update({
      where: { id: bankTransactionId },
      data: {
        matchStatus: BankMatchStatus.IGNORED,
      },
      include: {
        matchedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    // Аудит лог
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'IGNORE',
      entity: 'BankTransaction',
      entityId: bankTransactionId,
      after: {
        matchStatus: BankMatchStatus.IGNORED,
      },
    });

    return {
      id: updated.id,
      bankRef: updated.bankRef,
      bookedAt: updated.bookedAt,
      amount: updated.amount,
      description: updated.description,
      accountNo: updated.accountNo,
      counterparty: updated.counterparty,
      matchStatus: updated.matchStatus,
      matchedUserId: updated.matchedUserId,
      matchedUser: updated.matchedUser
        ? {
            id: updated.matchedUser.id,
            firstName: updated.matchedUser.firstName,
            lastName: updated.matchedUser.lastName,
            phone: updated.matchedUser.phone || '',
          }
        : null,
    };
  }

  // PRIVATE helper
  private getMonthFromDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}

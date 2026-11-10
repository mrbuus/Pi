import { Injectable, Logger } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { SheetsClient } from '../sheet-sync/sheets.client';
import { toCell, colLetter } from '../sheet-sync/sheet-book';
import { assignRowKeys, findCycles, normText, SHEET } from '../sheet-sync/payment-plan';
import { receiptTokens, writeTuition, type RowState } from '../sheet-sync/sheet-pay-writer';

export interface DemoSheetWrite {
  studentId: string;
  ok: boolean;
  cell?: string;
  month?: string;
  reason?: string;
}

/**
 * Гараар оноосон сургалтын төлбөрийг «Суудал баталгаажуулалт» хуудсанд ажилтны адил бичнэ.
 *  - Албан (эзэн 2026-11-10): SHEET_PAY_WRITE=1 → жинхэнэ шийт (PAYMENT_SHEET_ID). Service
 *    account шийтэд «Засварлагч» байх ёстой; үгүй бол бичилт алгасагдаж мэдэгдэнэ.
 *  - Демо: DEMO_SHEET_ID → тусдаа хуулбар файл (жинхэнэ шийттэй ижил ID бол ажиллахгүй).
 * Мөрийг шийт синкийн rowKey-ээр (нэр + утас) олж, бичихээс өмнө нэрийг шалгана.
 */
@Injectable()
export class DemoSheetService {
  private readonly logger = new Logger(DemoSheetService.name);
  private readonly client: SheetsClient | null;
  readonly demo: boolean;
  readonly sheetId: string | null;

  constructor(private readonly prisma: PrismaService) {
    const real = process.env.PAYMENT_SHEET_ID?.trim() || null;
    const demoId = process.env.DEMO_SHEET_ID?.trim() || null;
    const official = process.env.SHEET_PAY_WRITE === '1' && !!real;
    this.demo = !official;
    this.sheetId = official ? real : demoId && demoId !== real ? demoId : null;
    const keyJson = process.env.GOOGLE_SHEETS_KEY_JSON?.trim();
    const keyFile = process.env.GOOGLE_SHEETS_KEY_FILE?.trim() || join(process.cwd(), '.secrets', 'google-sheets.json');
    this.client =
      this.sheetId && (keyJson || existsSync(keyFile))
        ? new SheetsClient(keyJson ? { spreadsheetId: this.sheetId, keyJson } : { spreadsheetId: this.sheetId, keyFile }, { write: true })
        : null;
  }

  get enabled() {
    return !!this.client;
  }

  async writeTuition(parts: { studentId: string; amount: number }[], bookedAt: Date): Promise<DemoSheetWrite[]> {
    if (!this.client || !parts.length) return [];
    const date = new Date(bookedAt.getTime() + 8 * 3_600_000).toISOString().slice(0, 10);
    const tab = `'${SHEET.MAIN}'`;
    try {
      const [raw, shown] = await Promise.all([this.client.readRange(`${tab}!A1:BA`, 'UNFORMATTED_VALUE'), this.client.readRange(`${tab}!A1:BA`, 'FORMATTED_VALUE')]);
      const rows = raw.map((r, i) => r.map((v, c) => toCell(v, shown[i]?.[c])));
      const cycles = findCycles(rows, SHEET.MAIN, []);
      const keys = assignRowKeys(rows, 2);
      const byKey = new Map([...keys].map(([i, k]) => [k, i]));
      const out: DemoSheetWrite[] = [];
      for (const p of parts) {
        const links = await this.prisma.sheetRow.findMany({ where: { tab: SHEET.MAIN, studentId: p.studentId }, select: { rowKey: true } });
        const user = await this.prisma.user.findUnique({ where: { id: p.studentId }, select: { firstName: true, lastName: true } });
        const idx = links.map((l) => byKey.get(l.rowKey)).find((i) => i != null);
        if (idx == null || !user) {
          out.push({ studentId: p.studentId, ok: false, reason: 'Шийтэд энэ хүүхдийн мөр олдсонгүй' });
          continue;
        }
        const row = rows[idx];
        if (normText(row[2]).toLowerCase() !== normText(user.firstName).toLowerCase()) {
          out.push({ studentId: p.studentId, ok: false, reason: `${idx + 1}-р мөрийн нэр таарсангүй` });
          continue;
        }
        const r = idx + 1;
        const bg = await this.client.backgrounds(`${tab}!A${r}:BA${r}`);
        const blue = (c: number) => {
          const b = bg[0]?.[c];
          return !!b && Math.abs((b.red ?? 0) - 0.62) < 0.03 && Math.abs((b.green ?? 0) - 0.77) < 0.03 && Math.abs((b.blue ?? 0) - 0.91) < 0.03;
        };
        const state: RowState = {
          start: typeof row[10] === 'string' && /^\d{4}-/.test(row[10]) ? row[10] : null,
          form: normText(row[13]) || null,
          cycles: cycles.map(({ month, col }) => ({
            month,
            amount: typeof row[col] === 'number' ? (row[col] as number) : 0,
            text: typeof row[col] === 'string' ? (row[col] as string) : null,
            period: normText(row[col + 1]) || null,
            receipts: receiptTokens(row[col + 2]),
            skip: blue(col),
          })),
        };
        const w = writeTuition(state, { amount: p.amount, date });
        const c = state.cycles[w.idx];
        const col = cycles[w.idx].col;
        await this.client.writeValues([{ range: `${tab}!${colLetter(col)}${r}:${colLetter(col + 2)}${r}`, values: [[c.amount, c.period ?? '', c.receipts.join(', ')]] }]);
        // Дараагийн хэсэг (ах дүү ижил мөрөнд биш ч) шинэчлэгдсэн утгыг харна
        row[col] = c.amount;
        row[col + 1] = c.period;
        row[col + 2] = c.receipts.join(', ');
        out.push({ studentId: p.studentId, ok: true, cell: `${colLetter(col)}${r}`, month: c.month });
      }
      return out;
    } catch (e) {
      this.logger.warn(`Шийтэд бичсэнгүй: ${e instanceof Error ? e.message : e}`);
      return parts.map((p) => ({ studentId: p.studentId, ok: false, reason: 'Шийттэй холбогдож чадсангүй' }));
    }
  }
}

import { Injectable } from '@nestjs/common';
import { bookOrder, bookTitle } from '../book-payments/book-payments.logic';
import { mainFirst } from '../common/class-track';
import { Role } from '../generated/prisma/enums';
import { PaymentsLedgerService } from '../payments/ledger.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

/** «Бүх мэдээлэл» табын толгой — мөрийн дараалал `fullRow`-тай яг ижил */
export const FULL_HEADERS = [
  '№',
  'Код',
  'Овог',
  'Нэр',
  'Төлөв',
  'Төрөл',
  'Анги (жил)',
  'Одоогийн анги',
  'Бусад анги',
  'Салбар',
  'Өөрийн утас',
  'Аавын утас',
  'Ээжийн утас',
  'Апп дахь эцэг эхийн утас',
  'Сургууль',
  'Эхэлсэн',
  'Гарсан',
  'Архивласан шалтгаан',
  'Төлбөрийн хэлбэр',
  'Төлбөрийн дүн',
  'Тохирсон дүн',
  'Төлсөн',
  'Одоогийн өр',
  'Гэрээний үлдэгдэл',
  'Хүртэл төлсөн сар',
  'Ирсэн',
  'Хоцорсон',
  'Тасалсан',
  'Чөлөөтэй',
  'Даалгавар хийсэн',
  'Даалгавар дутуу',
  'Даалгавар хийгээгүй',
  'Төлсөн ном, хуудас',
  'Сайтад сүүлд орсон',
] as const;

const PLAN_LABEL: Record<string, string> = {
  FULL_YEAR: 'Бүтэн жил',
  INSTALLMENT: 'Хуваан',
  MONTHLY: 'Сар бүр',
};

const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);
/** УБ-ын цагаар «ЖЖЖЖ-СС-ӨӨ ЦЦ:ММ» */
const stamp = (d: Date | null | undefined) =>
  d ? new Date(d.getTime() + 8 * 3600_000).toISOString().slice(0, 16).replace('T', ' ') : null;

/**
 * «Сурагчид → Бүртгэл Excel татах»-ын «Бүх мэдээлэл» таб (эзэн 2026-11-16): татах агшны
 * сангийн бодит мэдээлэл — одоогийн анги (элсэлтээс), төлбөр (ledger), ирц, даалгавар, номын
 * мөнгө. Бүртгэлийн стандарт табууд (БҮРТГЭЛ-2027-той ижил байрлал) өмнө нь хэвээр.
 * Тогтмол 7 асуулга — сурагчийн тооноос хамаарахгүй.
 */
@Injectable()
export class StudentsFullExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly ledger: PaymentsLedgerService,
  ) {}

  async exportXlsx(actorId: string): Promise<Buffer> {
    const wb = await this.users.registrationWorkbook(actorId); // эрхийг энд шалгана
    const [students, ledgerRows, attendance, homework, books, parents] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: Role.STUDENT },
        select: {
          id: true,
          studentCode: true,
          firstName: true,
          lastName: true,
          phone: true,
          archivedAt: true,
          archiveReason: true,
          lastSeenAt: true,
          studentProfile: {
            select: {
              type: true,
              grade: true,
              school: true,
              branch: true,
              fatherPhone: true,
              motherPhone: true,
              tuitionAmount: true,
              tuitionAgreed: true,
              tuitionPlan: true,
              joinedOn: true,
              leftOn: true,
            },
          },
          enrollments: {
            where: { leftAt: null, classroom: { archived: false } },
            orderBy: { joinedAt: 'desc' },
            select: { classroom: { select: { name: true, subject: true } } },
          },
        },
      }),
      this.ledger.rows({}),
      this.prisma.attendance.groupBy({ by: ['studentId', 'status'], _count: { _all: true } }),
      this.prisma.dailyHomeworkMark.groupBy({
        by: ['studentId', 'status'],
        where: { status: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.bookPayment.findMany({
        where: { voidedAt: null, status: 'PAID' },
        select: { studentId: true, bookKey: true },
      }),
      this.prisma.parentLink.findMany({
        where: { verifiedAt: { not: null } },
        select: { studentId: true, parent: { select: { phone: true } } },
      }),
    ]);

    const money = new Map(ledgerRows.map((r) => [r.id, r]));
    const count = (rows: { studentId: string; status: string | null; _count: { _all: number } }[]) => {
      const m = new Map<string, Record<string, number>>();
      for (const r of rows) {
        if (!r.status) continue;
        const o = m.get(r.studentId) ?? {};
        o[r.status] = r._count._all;
        m.set(r.studentId, o);
      }
      return m;
    };
    const att = count(attendance);
    const hw = count(homework);
    const paidBooks = new Map<string, string[]>();
    for (const b of books)
      paidBooks.set(b.studentId, [...(paidBooks.get(b.studentId) ?? []), b.bookKey]);
    const parentPhones = new Map<string, string[]>();
    for (const p of parents)
      if (p.parent.phone)
        parentPhones.set(p.studentId, [...(parentPhones.get(p.studentId) ?? []), p.parent.phone]);

    const rank = (u: (typeof students)[number]) =>
      u.archivedAt || u.studentProfile?.leftOn ? 1 : 0;
    const sorted = [...students].sort((a, b) => {
      const ca = mainFirst(a.enrollments)[0]?.classroom.name ?? '￿';
      const cb = mainFirst(b.enrollments)[0]?.classroom.name ?? '￿';
      return (
        rank(a) - rank(b) ||
        ca.localeCompare(cb, 'mn', { numeric: true }) ||
        a.lastName.localeCompare(b.lastName, 'mn') ||
        a.firstName.localeCompare(b.firstName, 'mn')
      );
    });

    const ws = wb.addWorksheet('Бүх мэдээлэл', { views: [{ state: 'frozen', ySplit: 1, xSplit: 4 }] });
    ws.addRow([...FULL_HEADERS]).font = { bold: true };
    sorted.forEach((u, i) => {
      const p = u.studentProfile;
      const classes = mainFirst(u.enrollments).map((e) => e.classroom.name);
      const m = money.get(u.id);
      const a = att.get(u.id) ?? {};
      const h = hw.get(u.id) ?? {};
      const status = u.archivedAt ? 'Архивласан' : p?.leftOn ? 'Гарсан' : 'Идэвхтэй';
      ws.addRow([
        i + 1,
        u.studentCode,
        u.lastName,
        u.firstName,
        status,
        p?.type === 'ONLINE' ? 'Онлайн' : p?.type === 'CLASSROOM' ? 'Танхим' : null,
        p?.grade ?? null,
        classes[0] ?? null,
        classes.slice(1).join(' + ') || null,
        p?.branch ?? null,
        u.phone,
        p?.fatherPhone ?? null,
        p?.motherPhone ?? null,
        (parentPhones.get(u.id) ?? []).join(', ') || null,
        p?.school ?? null,
        day(p?.joinedOn),
        day(p?.leftOn),
        u.archiveReason,
        p?.tuitionPlan ? (PLAN_LABEL[p.tuitionPlan] ?? null) : null,
        p?.tuitionAmount ?? null,
        p?.tuitionAgreed ?? null,
        m?.paidTotal ?? null,
        m?.owedNow ?? null,
        m?.remaining ?? null,
        m?.coveredThrough ?? null,
        a.PRESENT ?? 0,
        a.LATE ?? 0,
        a.ABSENT ?? 0,
        a.EXCUSED ?? 0,
        h.DONE ?? 0,
        h.PARTIAL ?? 0,
        h.NOT_DONE ?? 0,
        [...new Set(paidBooks.get(u.id) ?? [])]
          .sort((x, y) => bookOrder(x) - bookOrder(y))
          .map(bookTitle)
          .join(', ') || null,
        stamp(u.lastSeenAt),
      ]);
    });
    const widths: Record<number, number> = { 1: 5, 2: 12, 3: 16, 4: 16, 8: 18, 9: 18, 14: 20, 15: 18, 18: 22, 33: 28, 34: 17 };
    FULL_HEADERS.forEach((_, i) => {
      ws.getColumn(i + 1).width = widths[i + 1] ?? 12;
    });
    // Утас, код — текст хэвээр (эхний 0 алдагдахгүй)
    for (const c of [2, 11, 12, 13, 14]) ws.getColumn(c).numFmt = '@';
    for (const c of [20, 21, 22, 23, 24]) ws.getColumn(c).numFmt = '#,##0';
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: FULL_HEADERS.length } };
    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}

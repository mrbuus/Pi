/* Synthetic test doubles only. */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaymentMethod, PaymentStatus, Role } from '../generated/prisma/enums';
import { PaymentFilterQueryDto } from './dto/payment-filter.dto';
import { FinanceCapabilityGuard } from './finance-capability.guard';
import {
  buildPaymentWhere,
  csvCell,
  exportFilename,
  PAYMENT_CSV_HEADERS,
  paymentsToCsv,
  toCsv,
} from './payments-export';
import { PaymentsExportController } from './payments-export.controller';
import {
  PAYMENT_EXPORT_MAX_ROWS,
  PaymentsExportService,
} from './payments-export.service';

const row = (over: Record<string, unknown> = {}) => ({
  createdAt: new Date('2026-10-20T01:00:00Z'),
  paidAt: new Date('2026-10-21T20:30:00Z'), // УБ-д 2026-10-22 04:30
  amount: 250000,
  method: PaymentMethod.BANK_TRANSFER,
  status: PaymentStatus.CONFIRMED,
  description: 'Бямба гарагийн анги',
  forMonth: '2026-10',
  user: {
    firstName: 'Өсөх',
    lastName: 'Баатар',
    phone: '99112233',
    studentCode: 'B27120001',
    enrollments: [{ classroom: { name: '9А' } }],
  },
  ...over,
});

describe('payments CSV', () => {
  it('starts with a UTF-8 BOM, uses Mongolian headers and keeps Cyrillic intact', () => {
    const csv = paymentsToCsv([row()]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const buf = Buffer.from(csv, 'utf8');
    expect([...buf.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const [head, line] = csv.slice(1).split('\r\n');
    expect(head).toBe(PAYMENT_CSV_HEADERS.map((h) => `"${h}"`).join(','));
    expect(head).toContain('"Дүн (₮)"');
    expect(line).toContain('"Өсөх"');
    expect(line).toContain('"Бямба гарагийн анги"');
  });

  it('writes the Ulaanbaatar date as YYYY-MM-DD and the amount as a plain number', () => {
    const line = paymentsToCsv([row()]).slice(1).split('\r\n')[1];
    const cells = line.split(',');
    expect(cells[0]).toBe('"2026-10-22"'); // 2026-10-21T20:30Z = УБ маргааш өглөө
    expect(cells[7]).toBe('250000'); // хашилтгүй, таслалгүй, ₮-гүй
    expect(cells[8]).toBe('"Данс"');
    expect(cells[9]).toBe('"Баталгаажсан"');
    expect(cells[6]).toBe('"2026-10"');
  });

  it('falls back to createdAt when the payment has no paidAt and sorts by date', () => {
    const csv = paymentsToCsv([
      row({ paidAt: null, createdAt: new Date('2026-10-02T03:00:00Z'), amount: 1 }),
      row({ paidAt: null, createdAt: new Date('2026-09-02T03:00:00Z'), amount: 2 }),
    ]);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[1].startsWith('"2026-09-02"')).toBe(true);
    expect(lines[2].startsWith('"2026-10-02"')).toBe(true);
  });

  it('blocks spreadsheet formula injection and escapes quotes', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+99112233')).toBe(`"'+99112233"`);
    expect(csvCell('-1')).toBe(`"'-1"`);
    expect(csvCell('@sum')).toBe(`"'@sum"`);
    expect(csvCell('a "b"')).toBe('"a ""b"""');
    expect(csvCell(null)).toBe('""');
    expect(csvCell(42)).toBe('42');
  });

  it('empty export still has BOM + header row', () => {
    const csv = toCsv(PAYMENT_CSV_HEADERS, []);
    expect(csv.startsWith('﻿"Огноо"')).toBe(true);
  });

  it('names the file pimath-tolbor-YYYY-MM-DD.csv in Ulaanbaatar time', () => {
    expect(
      exportFilename('pimath-tolbor', new Date('2026-10-22T10:00:00Z')),
    ).toBe('pimath-tolbor-2026-10-22.csv');
    // UTC 20:00 = УБ дараагийн өдөр
    expect(
      exportFilename('pimath-tolbor', new Date('2026-10-21T20:00:00Z')),
    ).toBe('pimath-tolbor-2026-10-22.csv');
  });
});

describe('shared payment filter', () => {
  it('no filter means no where clause', () => {
    expect(buildPaymentWhere({})).toEqual({});
  });
  it('combines status, month and an inclusive UB date range', () => {
    const where = buildPaymentWhere({
      status: PaymentStatus.CONFIRMED,
      month: '2026-10',
      from: '2026-10-01',
      to: '2026-10-31',
    }) as { AND: any[] };
    expect(where.AND[0]).toEqual({ status: 'CONFIRMED' });
    expect(where.AND[1]).toEqual({ forMonth: '2026-10' });
    const range = where.AND[2].OR[0].paidAt;
    expect(range.gte.toISOString()).toBe('2026-09-30T16:00:00.000Z'); // УБ 10-01 00:00
    expect(range.lt.toISOString()).toBe('2026-10-31T16:00:00.000Z'); // УБ 11-01 00:00
    expect(where.AND[2].OR[1]).toEqual({ paidAt: null, createdAt: range });
  });
  it('validates query params (bad month/date/status are 400s)', async () => {
    const check = (q: object) =>
      validate(plainToInstance(PaymentFilterQueryDto, q));
    expect(await check({})).toHaveLength(0);
    expect(
      await check({ status: 'PENDING', month: '2026-10', from: '2026-10-01', to: '2026-10-31' }),
    ).toHaveLength(0);
    for (const bad of [
      { status: 'NOPE' },
      { month: '2026-13' },
      { month: '10-2026' },
      { from: '2026-10-1' },
      { to: '2026-02-31x' },
    ])
      expect((await check(bad)).length).toBeGreaterThan(0);
  });
});

describe('PaymentsExportService', () => {
  function build(rows: unknown[]) {
    const prisma: any = {
      payment: { findMany: jest.fn().mockResolvedValue(rows) },
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    return { prisma, audit, service: new PaymentsExportService(prisma, audit as any) };
  }
  const actor = { id: 'plus', role: Role.TEACHER_PLUS };

  it('applies the same filters as the on-screen list, audits, and returns the CSV', async () => {
    const { prisma, audit, service } = build([row()]);
    const res = await service.csv({ status: PaymentStatus.CONFIRMED, month: '2026-10' }, actor);
    expect(prisma.payment.findMany.mock.calls[0][0].where).toEqual(
      buildPaymentWhere({ status: PaymentStatus.CONFIRMED, month: '2026-10' }),
    );
    expect(res.body.startsWith('﻿')).toBe(true);
    expect(res.filename).toMatch(/^pimath-tolbor-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'plus',
        action: 'EXPORT',
        entity: 'Payment',
        after: expect.objectContaining({ rows: 1 }),
      }),
    );
  });

  it('is not capped at the 200 rows of the screen list, but refuses absurd sizes', async () => {
    const { prisma, service } = build([row()]);
    await service.csv({}, actor);
    expect(prisma.payment.findMany.mock.calls[0][0].take).toBe(
      PAYMENT_EXPORT_MAX_ROWS + 1,
    );
    const over = build(new Array(PAYMENT_EXPORT_MAX_ROWS + 1).fill(row()));
    await expect(over.service.csv({}, actor)).rejects.toBeInstanceOf(BadRequestException);
    expect(over.audit.record).not.toHaveBeenCalled();
  });

  it('rejects an inverted date range', async () => {
    const { prisma, service } = build([]);
    await expect(
      service.csv({ from: '2026-10-31', to: '2026-10-01' }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.payment.findMany).not.toHaveBeenCalled();
  });
});

describe('GET /payments/export/csv access', () => {
  it('has the same guards and roles as GET /payments (finance.manage, ADMIN + Teacher+)', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, PaymentsExportController);
    expect(guards).toEqual([JwtAuthGuard, RolesGuard, FinanceCapabilityGuard]);
    expect(Reflect.getMetadata(ROLES_KEY, PaymentsExportController)).toEqual([
      Role.ADMIN,
      Role.TEACHER_PLUS,
    ]);
  });
});

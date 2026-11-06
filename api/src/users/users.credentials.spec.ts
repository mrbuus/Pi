/* Synthetic prisma/audit doubles; bcrypt is real so the hash comparison is exercised. */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import * as bcrypt from 'bcryptjs';
import { BadRequestException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { UsersService } from './users.service';

const PHONE = '94800118';

function build(phone: string | null) {
  const update = jest.fn().mockResolvedValue({});
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'u1', phone }),
      update,
    },
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new UsersService(
    prisma as never,
    audit as never,
    {} as never,
  );
  return { service, update, audit };
}

describe('админ нууц үг тохируулах', () => {
  it('нууц үг өгөөгүй бол утас руу буцаана, аудитад утгыг бичихгүй', async () => {
    const { service, update, audit } = build(PHONE);
    const res = await service.setPasswordByAdmin(
      'u1',
      undefined,
      'admin',
      Role.ADMIN,
    );
    const data = update.mock.calls[0][0].data;
    expect(await bcrypt.compare(PHONE, data.passwordHash as string)).toBe(true);
    expect(data.passwordChangedAt).toBeInstanceOf(Date);
    expect(res.resetTo).toBe('phone');
    expect(JSON.stringify(audit.record.mock.calls[0][0])).not.toContain(PHONE);
  });

  it('өөрийн нууц үг тавина, сул нууц үгийг татгалзана', async () => {
    const { service, update } = build(PHONE);
    await expect(
      service.setPasswordByAdmin('u1', '123', 'admin', Role.ADMIN),
    ).rejects.toBeInstanceOf(BadRequestException);
    await service.setPasswordByAdmin(
      'u1',
      'Shine#Ireedui26',
      'admin',
      Role.ADMIN,
    );
    const data = update.mock.calls[0][0].data;
    expect(
      await bcrypt.compare('Shine#Ireedui26', data.passwordHash as string),
    ).toBe(true);
  });

  it('утасгүй хэрэглэгчийг утас руу буцаах боломжгүй', async () => {
    const { service } = build(null);
    await expect(
      service.setPasswordByAdmin('u1', undefined, 'admin', Role.ADMIN),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

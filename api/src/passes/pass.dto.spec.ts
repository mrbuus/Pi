import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreatePassDto,
  GrantPassDto,
  RevokePassGrantDto,
  UpdatePassDto,
} from './dto/pass.dto';

async function errors<T extends object>(cls: new () => T, value: unknown) {
  return validate(plainToInstance(cls, value));
}

describe('эрхийн хүсэлтийн DTO', () => {
  it('CreatePassDto шаардлагатай нэр, хоног, зөв scope шаардана', async () => {
    expect(
      (
        await errors(CreatePassDto, {
          name: '',
          durationDays: 0,
          scope: { all: true },
        })
      ).length,
    ).toBeGreaterThan(0);
    expect(
      await errors(CreatePassDto, {
        name: 'Сарын эрх',
        durationDays: 30,
        scope: { all: true },
      }),
    ).toHaveLength(0);
    expect(
      (
        await errors(CreatePassDto, {
          name: 'Сарын эрх',
          durationDays: 30,
          scope: { notARealScope: true },
        })
      ).length,
    ).toBeGreaterThan(0);
  });

  it('UpdatePassDto хоосон нэр, сөрөг үнэ, бүх талбар буруу үед алдаа өгнө', async () => {
    expect((await errors(UpdatePassDto, { name: '' })).length).toBeGreaterThan(
      0,
    );
    expect((await errors(UpdatePassDto, { price: -1 })).length).toBeGreaterThan(
      0,
    );
    expect(
      (await errors(UpdatePassDto, { durationDays: 0, active: 'yes' })).length,
    ).toBeGreaterThan(0);
    expect(await errors(UpdatePassDto, { active: false })).toHaveLength(0);
  });

  it('GrantPassDto хэрэглэгчийн хоосон бус ID шаардана', async () => {
    expect((await errors(GrantPassDto, {})).length).toBeGreaterThan(0);
    expect((await errors(GrantPassDto, { userId: '' })).length).toBeGreaterThan(
      0,
    );
    expect(await errors(GrantPassDto, { userId: 'student-1' })).toHaveLength(0);
    expect(
      (await errors(GrantPassDto, { userId: 'student-1', note: '' })).length,
    ).toBeGreaterThan(0);
    expect(
      await errors(GrantPassDto, { userId: 'student-1', note: 'Синтетик' }),
    ).toHaveLength(0);
  });

  it('RevokePassGrantDto цуцлах шалтгаан шаардана', async () => {
    expect(await errors(RevokePassGrantDto, {})).not.toHaveLength(0);
    expect(
      await errors(RevokePassGrantDto, { reason: '   ' }),
    ).not.toHaveLength(0);
    expect(
      await errors(RevokePassGrantDto, { reason: 'Шалтгаантай туршилт' }),
    ).toHaveLength(0);
  });
});

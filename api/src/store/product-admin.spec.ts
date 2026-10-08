import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProductKind, Role } from '../generated/prisma/enums';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import {
  CreateProductDto,
  UpdatePriceDto,
  UpdateProductStatusDto,
} from './dto/purchase.dto';

function setup() {
  const db = {
    productItem: {
      findUnique: jest
        .fn()
        .mockResolvedValue({
          id: 'p',
          kind: ProductKind.BOOK,
          refId: 'book',
          active: false,
        }),
      update: jest
        .fn()
        .mockImplementation(({ data }) => ({ id: 'p', ...data })),
    },
    book: {
      findUnique: jest.fn().mockResolvedValue({ id: 'book', deletedAt: null }),
    },
    test: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'test', isDraft: false, deletedAt: null }),
    },
  };
  return { db, service: new StoreService(db as never) };
}

describe('store admin controls', () => {
  it.each([
    Role.TEACHER_PLUS,
    Role.TEACHER,
    Role.STUDENT,
    Role.BUYER,
    Role.PARENT,
  ])('denies price/status changes for %s', async (role) => {
    const { db, service } = setup();
    await expect(
      service.updatePrice('p', 100, 'actor', role),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.updateStatus('p', true, role)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(db.productItem.update).not.toHaveBeenCalled();
  });
  it('reactivates and deactivates a valid product without touching historic purchases', async () => {
    const { db, service } = setup();
    expect(await service.updateStatus('p', true, Role.ADMIN)).toEqual({
      id: 'p',
      active: true,
    });
    expect(await service.updateStatus('p', false, Role.ADMIN)).toEqual({
      id: 'p',
      active: false,
    });
    expect(db.productItem.update.mock.calls.map(([arg]) => arg.data)).toEqual([
      { active: true },
      { active: false },
    ]);
  });
  it('cannot reactivate a missing, deleted or unpublished content reference', async () => {
    const { db, service } = setup();
    db.book.findUnique.mockResolvedValue({
      id: 'book',
      deletedAt: new Date(),
    } as never);
    await expect(
      service.updateStatus('p', true, Role.ADMIN),
    ).rejects.toBeInstanceOf(NotFoundException);
    db.productItem.findUnique.mockResolvedValue({
      id: 'p',
      kind: ProductKind.TEST,
      refId: 'test',
      active: false,
    });
    db.test.findUnique.mockResolvedValue({
      id: 'test',
      isDraft: true,
      deletedAt: null,
    });
    await expect(
      service.updateStatus('p', true, Role.ADMIN),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.productItem.update).not.toHaveBeenCalled();
  });
  it.each([-1, 0.5, NaN, Infinity, 2147483648])(
    'rejects invalid price %s at service and DTO boundary',
    async (price) => {
      const { db, service } = setup();
      expect(
        await validate(plainToInstance(UpdatePriceDto, { price })),
      ).not.toHaveLength(0);
      expect(
        await validate(
          plainToInstance(CreateProductDto, {
            kind: 'BOOK',
            refId: 'book',
            price,
          }),
        ),
      ).not.toHaveLength(0);
      await expect(
        service.updatePrice('p', price, 'admin', Role.ADMIN),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.productItem.update).not.toHaveBeenCalled();
    },
  );
  it('accepts free and maximum integer prices and preserves false status through whitelist', async () => {
    const { service } = setup();
    for (const price of [0, 2147483647]) {
      expect(
        await validate(plainToInstance(UpdatePriceDto, { price })),
      ).toHaveLength(0);
      expect(
        await service.updatePrice('p', price, 'admin', Role.ADMIN),
      ).toEqual({ id: 'p', price });
    }
    const pipe = new ValidationPipe({ whitelist: true, transform: true });
    const dto = await pipe.transform(
      { active: false, injected: true },
      { type: 'body', metatype: UpdateProductStatusDto },
    );
    expect(dto).toEqual({ active: false });
    for (const active of ['false', 0, null, undefined])
      expect(
        await validate(plainToInstance(UpdateProductStatusDto, { active })),
      ).not.toHaveLength(0);
  });
  it('uses concrete DTO classes so Nest validation cannot silently bypass the body', () => {
    expect(
      Reflect.getMetadata(
        'design:paramtypes',
        StoreController.prototype,
        'updatePrice',
      )[2],
    ).toBe(UpdatePriceDto);
    expect(
      Reflect.getMetadata(
        'design:paramtypes',
        StoreController.prototype,
        'updateStatus',
      )[2],
    ).toBe(UpdateProductStatusDto);
    expect(
      Reflect.getMetadata(
        'design:paramtypes',
        StoreController.prototype,
        'createProduct',
      )[1],
    ).toBe(CreateProductDto);
  });
});

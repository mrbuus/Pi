import { NotFoundException } from '@nestjs/common';
import { ProductKind, Role } from '../generated/prisma/enums';
import { StoreService } from './store.service';
describe('draft store exclusion', () => {
  it('rejects creating a product for a private draft', async () => {
    const prisma = { test: { findUnique: jest.fn().mockResolvedValue({ id: 'draft', isDraft: true, deletedAt: null }) } };
    const service = new StoreService(prisma as never);
    await expect(service.createProduct(ProductKind.TEST, 'draft', 100, 'admin', Role.ADMIN)).rejects.toBeInstanceOf(NotFoundException);
  });
});

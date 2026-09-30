import { Test } from '@nestjs/testing';
import { AttemptsService } from '../attempts/attempts.service';
import { MistakeCollector } from '../mistakes/mistake-collector.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from './progress.service';
import { ProgressModule } from './progress.module';

describe('ProgressModule dependency wiring', () => {
  it('boots its reused attempt services with the mistake collector and synthetic Prisma provider', async () => {
    const prisma = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      imports: [ProgressModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    const app = moduleRef.createNestApplication();
    try {
      await app.init();
      expect(moduleRef.get(ProgressService)).toBeInstanceOf(ProgressService);
      expect(moduleRef.get(AttemptsService)).toBeInstanceOf(AttemptsService);
      expect(moduleRef.get(MistakeCollector)).toBeInstanceOf(MistakeCollector);
    } finally {
      await app.close();
    }
  });
});

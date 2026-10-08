import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from './prisma/prisma.service';

describe('health monitoring', () => {
  const query = jest.fn();
  const controller = new HealthController({
    $queryRaw: query,
  } as unknown as PrismaService);
  beforeEach(() => query.mockReset());
  it('liveness does not depend on the database', () => {
    expect(controller.live()).toEqual({ status: 'ok', service: 'pi.mn-v2' });
    expect(query).not.toHaveBeenCalled();
  });
  it('readiness verifies a query', async () => {
    query.mockResolvedValue([{ '?column?': 1 }]);
    expect(await controller.ready()).toEqual({
      status: 'ready',
      service: 'pi.mn-v2',
    });
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('database diagnostics and connection strings never escape', async () => {
    query.mockRejectedValue(
      new Error('postgres://secret@private-host/password'),
    );
    await expect(controller.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    try {
      await controller.ready();
    } catch (error) {
      expect((error as Error).message).not.toContain('secret');
      expect((error as Error).message).not.toContain('private-host');
    }
  });
});

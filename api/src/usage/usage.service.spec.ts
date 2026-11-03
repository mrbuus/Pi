import { Role } from '../generated/prisma/enums';
import { UsageService } from './usage.service';

describe('UsageService — санах ойд цуглуулж багцлан бичнэ', () => {
  const createMany = jest.fn().mockResolvedValue({ count: 0 });
  const service = new UsageService({ uiEvent: { createMany } } as never);

  beforeEach(() => createMany.mockClear());

  it('record() сан руу шууд бичихгүй; flush() олон хүсэлтийг нэг createMany-д', async () => {
    const dto = {
      device: 'mobile' as const,
      events: [
        { kind: 'page' as const, path: '/app/student' },
        { kind: 'click' as const, path: '/app/student', target: 'text:Бат Болд' },
      ],
    };
    expect(service.record('u1', Role.STUDENT, dto)).toEqual({ accepted: 1 });
    expect(service.record('u2', Role.TEACHER, dto)).toEqual({ accepted: 1 });
    expect(createMany).not.toHaveBeenCalled();

    await service.flush();
    expect(createMany).toHaveBeenCalledTimes(1);
    expect(createMany.mock.calls[0][0].data).toHaveLength(2);

    await service.flush();
    expect(createMany).toHaveBeenCalledTimes(1); // хоосон үед сан руу очихгүй
  });

  it('сан алдаа өгсөн ч exception шидэхгүй', async () => {
    createMany.mockRejectedValueOnce(new Error('pool timeout'));
    service.record('u1', Role.STUDENT, { device: 'desktop', events: [{ kind: 'page', path: '/app' }] });
    await expect(service.flush()).resolves.toBeUndefined();
  });
});

import { MistakeCollector } from './mistake-collector.service';

describe('MistakeCollector.collectAttemptsInBackground', () => {
  it('хүсэлтийг хүлээлгэхгүй, дарааллаар цуглуулж, унтрахдаа дуусахыг хүлээнэ', async () => {
    const collector = new MistakeCollector({} as never);
    const order: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    jest.spyOn(collector, 'collectAttempt').mockImplementation(async (id: string) => {
      order.push(`start:${id}`);
      if (id === 'a') await gate;
      order.push(`end:${id}`);
      return true;
    });

    collector.collectAttemptsInBackground(['a', 'b']);
    expect(order).toEqual(['start:a']); // буцсан ч ажил үргэлжилж байна
    const shutdown = collector.onModuleDestroy();
    release();
    await shutdown;
    expect(order).toEqual(['start:a', 'end:a', 'start:b', 'end:b']);
  });

  it('хоосон жагсаалтад юу ч хийхгүй', () => {
    const collector = new MistakeCollector({} as never);
    const spy = jest.spyOn(collector, 'collectAttempt');
    collector.collectAttemptsInBackground([]);
    expect(spy).not.toHaveBeenCalled();
  });
});

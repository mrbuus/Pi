import { TtlCache } from './ttl-cache';

describe('TtlCache', () => {
  let now = 0;
  const cache = () => new TtlCache<number>(1000, 2, () => now);
  beforeEach(() => (now = 0));

  it('TTL дотор дахин ачаалахгүй, дууссаны дараа шинээр ачаална', async () => {
    const c = cache();
    const load = jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    expect(await c.get('k', load)).toBe(1);
    now = 999;
    expect(await c.get('k', load)).toBe(1);
    now = 1000;
    expect(await c.get('k', load)).toBe(2);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('зэрэг асуувал НЭГ л ачаалал (single-flight)', async () => {
    const c = cache();
    let resolve!: (v: number) => void;
    const load = jest.fn(() => new Promise<number>((r) => (resolve = r)));
    const a = c.get('k', load);
    const b = c.get('k', load);
    resolve(7);
    expect(await Promise.all([a, b])).toEqual([7, 7]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('алдааг кэшлэхгүй', async () => {
    const c = cache();
    const load = jest.fn().mockRejectedValueOnce(new Error('db')).mockResolvedValueOnce(3);
    await expect(c.get('k', load)).rejects.toThrow('db');
    expect(await c.get('k', load)).toBe(3);
  });

  it('delete нислэгт байсан хуучин үр дүнг хадгалуулахгүй', async () => {
    const c = cache();
    let resolve!: (v: number) => void;
    const p = c.get('k', () => new Promise<number>((r) => (resolve = r)));
    c.delete('k');
    resolve(1);
    await p;
    expect(c.size).toBe(0);
    expect(await c.get('k', async () => 2)).toBe(2);
  });

  it('maxEntries-ээс хэтрэхгүй (хамгийн хуучныг хаяна)', async () => {
    const c = cache();
    await c.get('a', async () => 1);
    await c.get('b', async () => 2);
    await c.get('c', async () => 3);
    expect(c.size).toBe(2);
    const load = jest.fn(async () => 9);
    expect(await c.get('a', load)).toBe(9);
  });
});

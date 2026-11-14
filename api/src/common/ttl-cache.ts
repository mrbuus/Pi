/**
 * Процессын санах ойн богино TTL-тэй кэш (docs/BACKEND-PERF.md).
 *
 * Зөвхөн НИЙТИЙН / бүх хэрэглэгчид ижил, ховор өөрчлөгддөг өгөгдөлд
 * (томьёоны сан, номын каталог) эсвэл бичих үед заавал `delete`/`clear`
 * дуудагддаг өгөгдөлд (мэдэгдлийн тоо) хэрэглэнэ.
 *
 * - Ижил түлхүүрийг зэрэг асуувал НЭГ л query явна (single-flight).
 * - Алдаа кэшлэгдэхгүй — дараагийн хүсэлт дахин оролдоно.
 * - `maxEntries`-ээс хэтэрвэл хамгийн хуучныг хаяна (санах ой хязгаартай).
 * - Буцаасан утгыг ХУВААЛЦАЖ байгаа тул дуудагч мутаци хийх ёсгүй
 *   (StripProblemTokenInterceptor нь хуулбар үүсгэдэг — аюулгүй).
 */
export class TtlCache<V> {
  private readonly values = new Map<string, { value: V; expiresAt: number }>();
  private readonly inflight = new Map<string, Promise<V>>();
  /** delete/clear бүрд нэмэгдэнэ — нислэгт байсан хуучин үр дүнг хадгалахгүй */
  private generation = 0;

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 500,
    private readonly now: () => number = Date.now,
  ) {}

  async get(key: string, load: () => Promise<V>): Promise<V> {
    const hit = this.values.get(key);
    if (hit && hit.expiresAt > this.now()) return hit.value;
    if (hit) this.values.delete(key);

    const pending = this.inflight.get(key);
    if (pending) return pending;

    const generation = this.generation;
    const settle = () => {
      if (this.inflight.get(key) === promise) this.inflight.delete(key);
    };
    const promise: Promise<V> = load().then(
      (value) => {
        settle();
        if (generation === this.generation) this.set(key, value);
        return value;
      },
      (error: unknown) => {
        settle();
        throw error;
      },
    );
    this.inflight.set(key, promise);
    return promise;
  }

  delete(key: string): void {
    this.generation += 1;
    this.values.delete(key);
    this.inflight.delete(key);
  }

  clear(): void {
    this.generation += 1;
    this.values.clear();
    this.inflight.clear();
  }

  get size(): number {
    return this.values.size;
  }

  private set(key: string, value: V): void {
    if (this.values.size >= this.maxEntries && !this.values.has(key)) {
      const oldest = this.values.keys().next().value;
      if (oldest !== undefined) this.values.delete(oldest);
    }
    this.values.set(key, { value, expiresAt: this.now() + this.ttlMs });
  }
}

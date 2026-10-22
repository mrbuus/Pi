import { createHash } from 'node:crypto';

type Attempts = { failures: number[]; lockedUntil: number; alertedAt?: number };
const WINDOW_MS = 15 * 60 * 1000;
/** Бүртгэлийн эзэнд «буруу нууц үг» имэйл илгээх босго (эзэн 2026-10-22) */
export const ALERT_AFTER_FAILURES = 3;
/** Instance-local memory: restart/deploy clears it. Shared storage is required before scaling out. */
export class LoginAttempts {
  private readonly entries = new Map<string, Attempts>();
  constructor(private readonly now: () => number = Date.now, private readonly maxEntries = 10_000) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1) throw new Error('maxEntries must be positive');
  }
  private key(identifier: string): string {
    return createHash('sha256').update(identifier.toLowerCase().replace(/\s+/g, '')).digest('hex');
  }
  private current(key: string, now: number): Attempts | undefined {
    const entry = this.entries.get(key);
    if (!entry) return;
    entry.failures = entry.failures.filter((time) => now - time < WINDOW_MS);
    if (
      entry.lockedUntil <= now &&
      !entry.failures.length &&
      (entry.alertedAt === undefined || now - entry.alertedAt >= WINDOW_MS)
    ) {
      this.entries.delete(key);
      return;
    }
    return entry;
  }
  isLocked(identifier: string): boolean {
    const now = this.now();
    const entry = this.current(this.key(identifier), now);
    if (entry) return entry.lockedUntil > now;
    if (this.entries.size < this.maxEntries) return false;
    for (const key of this.entries.keys()) this.current(key, now);
    // Preserve live locks. If all slots are locked, temporarily reject new identifiers.
    return this.entries.size >= this.maxEntries &&
      [...this.entries.values()].every((value) => value.lockedUntil > now);
  }
  /** Буруу оролдлого бүртгэнэ; цонхон доторх тоог буцаана (түгжигдсэн үед 0). */
  failure(identifier: string): number {
    const now = this.now(), key = this.key(identifier);
    let entry = this.current(key, now);
    if (entry?.lockedUntil && entry.lockedUntil > now) return 0; // Blocked attempts do not extend the lock.
    if (!entry) {
      if (this.entries.size >= this.maxEntries) {
        for (const oldKey of this.entries.keys()) this.current(oldKey, now);
        // Bounded memory even during attacks with many distinct identifiers.
        if (this.entries.size >= this.maxEntries) {
          const replaceable = [...this.entries].find(([, value]) => value.lockedUntil <= now);
          if (!replaceable) return 0;
          this.entries.delete(replaceable[0]);
        }
      }
      entry = { failures: [], lockedUntil: 0 };
      this.entries.set(key, entry);
    }
    entry.failures.push(now);
    if (entry.failures.length >= 8) entry.lockedUntil = now + WINDOW_MS;
    return entry.failures.length;
  }
  /**
   * «3 удаа буруу» мэдэгдлийг илгээх эсэх. Цонхон дотор `threshold`-д хүрмэгц
   * ЯГ НЭГ удаа true буцаана — дараагийн оролдлогууд 15 минутын турш (түгжээний
   * цонх) дахин имэйл үүсгэхгүй (spam хийхгүй). Амжилттай нэвтэрвэл success()
   * бичлэгийг арилгаж тоолуур шинээр эхэлнэ.
   */
  claimAlert(identifier: string, threshold = ALERT_AFTER_FAILURES): boolean {
    const now = this.now();
    const entry = this.current(this.key(identifier), now);
    if (!entry || entry.failures.length < threshold) return false;
    if (entry.alertedAt !== undefined && now - entry.alertedAt < WINDOW_MS) return false;
    entry.alertedAt = now;
    return true;
  }
  success(identifier: string): void { this.entries.delete(this.key(identifier)); }
  get size(): number { return this.entries.size; }
}
export const loginAttempts = new LoginAttempts();
/**
 * Бүртгэл (userId) тус бүрийн буруу НУУЦ ҮГИЙН тоолуур — зөвхөн «3 удаа буруу»
 * имэйлд. Нэвтрэх нэрээр (утас/имэйл/нэр) биш ID-аар тоолох нь: халдагч гурван
 * өөр нэрээр нэг бүртгэлийг оролдсон ч нэг тоолуурт орно. Түгжээ нь loginAttempts-д.
 */
export const accountAttempts = new LoginAttempts();

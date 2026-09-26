import { createHash } from 'node:crypto';

type Attempts = { failures: number[]; lockedUntil: number };
const WINDOW_MS = 15 * 60 * 1000;
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
    if (entry.lockedUntil <= now && !entry.failures.length) {
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
  failure(identifier: string): void {
    const now = this.now(), key = this.key(identifier);
    let entry = this.current(key, now);
    if (entry?.lockedUntil && entry.lockedUntil > now) return; // Blocked attempts do not extend the lock.
    if (!entry) {
      if (this.entries.size >= this.maxEntries) {
        for (const oldKey of this.entries.keys()) this.current(oldKey, now);
        // Bounded memory even during attacks with many distinct identifiers.
        if (this.entries.size >= this.maxEntries) {
          const replaceable = [...this.entries].find(([, value]) => value.lockedUntil <= now);
          if (!replaceable) return;
          this.entries.delete(replaceable[0]);
        }
      }
      entry = { failures: [], lockedUntil: 0 };
      this.entries.set(key, entry);
    }
    entry.failures.push(now);
    if (entry.failures.length >= 8) entry.lockedUntil = now + WINDOW_MS;
  }
  success(identifier: string): void { this.entries.delete(this.key(identifier)); }
  get size(): number { return this.entries.size; }
}
export const loginAttempts = new LoginAttempts();

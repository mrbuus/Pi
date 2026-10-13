import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { shortName } from '../revisions/revision-snapshot';

/**
 * «Хэн засаж байна» (docs/v2/ZEREG-ZASVAR-TOLOVLOGOO.md §4).
 *
 * Хөтөч засварлагч/шалгалтын самбар нээлттэй үед 45 сек тутам дохио илгээнэ
 * (таб нуугдвал зогсоно). ӨС-д ОГТ бичихгүй — API-ийн санах ойд TTL-тэй
 * (Render нэг instance; дахин асахад хоосорно — зөвхөн мэдээллийн тэмдэг).
 * Нэр, эрх хэрэглэгч тутам 10 мин кэштэй тул ихэнх дохио ӨС-д query хийхгүй.
 * Зөвхөн төвийн багш (гадны багш, архивласан хэрэглэгч биш — common/access-тэй ижил).
 */

/** Сүүлийн дохионоос хойш ийм удаан чимээгүй бол гарсанд тооцно (2 дохио алгассан) */
export const PRESENCE_TTL_MS = 100_000;
const IDENTITY_TTL_MS = 10 * 60_000;
const SWEEP_EVERY_MS = 15_000;
/** Санах ойн дээд хязгаар — хэтэрвэл шинэ бичлэг нэмэхгүй (хуучин нь TTL-ээр цэвэрлэгдэнэ) */
const MAX_ENTRIES = 5_000;
/** Нэг хэрэглэгч олон түлхүүрээр санах ойг дүүргэхгүй — хамгийн хуучныг нь гаргана */
export const MAX_ROOMS_PER_USER = 8;

export interface PresenceEditor {
  name: string;
  /** Хэзээнээс хойш нээсэн (ISO) */
  since: string;
}

interface Entry {
  name: string;
  since: number;
  at: number;
}

interface Identity {
  name: string;
  internal: boolean;
  at: number;
}

@Injectable()
export class PresenceService {
  private readonly rooms = new Map<string, Map<string, Entry>>();
  /** userId → түүний байгаа өрөөнүүд (хэрэглэгч тутмын хязгаарт) */
  private readonly userRooms = new Map<string, Set<string>>();
  private readonly identities = new Map<string, Identity>();
  private entries = 0;
  private sweptAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  async beat(
    userId: string,
    keys: string[],
    leave = false,
    now = Date.now(),
  ): Promise<{ editors: Record<string, PresenceEditor[]> }> {
    const me = await this.identityOf(userId, now);
    if (!me.internal)
      throw new ForbiddenException('Төвийн багшийн эрх шаардлагатай');
    this.sweep(now);
    const unique = [...new Set(keys)];
    if (leave) {
      for (const key of unique) this.remove(key, userId);
    } else {
      for (const key of unique) this.add(key, userId, me.name, now);
    }
    const editors: Record<string, PresenceEditor[]> = {};
    for (const key of unique) {
      editors[key] = [...(this.rooms.get(key)?.entries() ?? [])]
        .filter(([id, e]) => id !== userId && now - e.at < PRESENCE_TTL_MS)
        .sort(([, a], [, b]) => a.since - b.since)
        .map(([, e]) => ({
          name: e.name,
          since: new Date(e.since).toISOString(),
        }));
    }
    return { editors };
  }

  private add(key: string, userId: string, name: string, now: number) {
    const prev = this.rooms.get(key)?.get(userId);
    if (!prev) {
      const mine = this.userRooms.get(userId);
      if (mine && mine.size >= MAX_ROOMS_PER_USER) {
        // хамгийн хуучин дохиотой өрөөг нь гаргана
        let oldest: string | null = null;
        let oldestAt = Infinity;
        for (const k of mine) {
          const at = this.rooms.get(k)?.get(userId)?.at ?? -Infinity;
          if (at < oldestAt) {
            oldestAt = at;
            oldest = k;
          }
        }
        if (oldest) this.remove(oldest, userId);
      }
      if (this.entries >= MAX_ENTRIES) return;
    }
    let room = this.rooms.get(key);
    if (!room) {
      room = new Map();
      this.rooms.set(key, room);
    }
    if (!prev) {
      this.entries += 1;
      const mine = this.userRooms.get(userId) ?? new Set<string>();
      mine.add(key);
      this.userRooms.set(userId, mine);
    }
    room.set(userId, { name, since: prev?.since ?? now, at: now });
  }

  private remove(key: string, userId: string) {
    const room = this.rooms.get(key);
    if (!room?.delete(userId)) return;
    this.entries -= 1;
    if (room.size === 0) this.rooms.delete(key);
    const mine = this.userRooms.get(userId);
    mine?.delete(key);
    if (mine && mine.size === 0) this.userRooms.delete(userId);
  }

  private sweep(now: number) {
    if (now - this.sweptAt < SWEEP_EVERY_MS) return;
    this.sweptAt = now;
    for (const [key, room] of this.rooms) {
      for (const [userId, e] of room) {
        if (now - e.at >= PRESENCE_TTL_MS) this.remove(key, userId);
      }
    }
    for (const [userId, n] of this.identities)
      if (now - n.at >= IDENTITY_TTL_MS) this.identities.delete(userId);
  }

  private async identityOf(userId: string, now: number): Promise<Identity> {
    const cached = this.identities.get(userId);
    if (cached && now - cached.at < IDENTITY_TTL_MS) return cached;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        role: true,
        archivedAt: true,
        externalTeacherProfile: { select: { userId: true } },
      },
    });
    const internal =
      !!user &&
      !user.archivedAt &&
      (user.role === Role.ADMIN ||
        ((user.role === Role.TEACHER || user.role === Role.TEACHER_PLUS) &&
          !user.externalTeacherProfile));
    const identity = { name: shortName(user), internal, at: now };
    this.identities.set(userId, identity);
    return identity;
  }
}

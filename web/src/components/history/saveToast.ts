"use client";

import { toast } from "sonner";
import {
  confirmRequiredOf,
  restoreRevision,
  versionConflictOf,
  type RestoreResult,
  type RevisionEntity,
} from "@/lib/revisions";

/**
 * Хадгалсны дараах 10 сек «Хадгаллаа» мэдэгдэл + «Буцаах» товч
 * (docs/v2/BUTSAAH-TUUKH-TOLOVLOGOO.md §2). Буцаах нь өмнөх хувилбарыг
 * сэргээх endpoint-оор явна — өөрөө шинэ хувилбар болж түүхэнд үлдэнэ.
 * Засварлагч хаагдсан ч ажиллана (компонентын төлөвөөс хамаарахгүй).
 *
 * Зэрэг засвар (docs/v2/ZEREG-ZASVAR-TOLOVLOGOO.md §2): сервер бусдын өөрчлөлттэй
 * нэгтгэсэн бол хувилбар хэд алхаж болно — буцаах нь ЗӨВХӨН энэ хадгалалтыг
 * (savedVersion − 1 руу), бусдынхыг хөндөхгүй.
 */
export function showSavedToast(opts: {
  entity: RevisionEntity;
  id: string;
  /** Засварлагч ачаалсан хувилбар (expectedVersion) */
  previousVersion: number;
  savedVersion: number;
  /** Сервер өөрчлөлт бичсэн эсэх (мэдэгдээгүй бол хувилбараас таамаглана) */
  changed?: boolean;
  /** Бусдын хадгалсан өөрчлөлттэй нэгтгэсэн бол тэдний нэр */
  mergedWith?: string[] | null;
  onUndone?: (result: RestoreResult) => void;
}) {
  const changed = opts.changed ?? opts.savedVersion > opts.previousVersion;
  const description = mergedNotice(opts.mergedWith);
  if (!changed) {
    toast.success(description ? "Өөрчлөлт алга" : "Хадгаллаа", description ? { description } : undefined);
    return;
  }
  toast.success("Хадгаллаа", {
    duration: 10_000,
    ...(description ? { description } : {}),
    action: { label: "Буцаах", onClick: () => void undoSave(opts) },
  });
}

/** «Тэр хооронд Б. Баасанжав өөрчилсөн — бүх өөрчлөлт хадгалагдлаа» — нэгтгээгүй бол null */
export function mergedNotice(mergedWith: string[] | null | undefined): string | null {
  if (!mergedWith) return null;
  // Нэрийг хувилгахгүй (эгшиг зохицох -ын/-ийн алдахгүйн тулд)
  return mergedWith.length
    ? `Тэр хооронд ${mergedWith.join(", ")} өөрчилсөн — бүх өөрчлөлт хадгалагдлаа`
    : "Таны өөр цонхонд хадгалсан өөрчлөлттэй нэгтгэлээ";
}

async function undoSave(
  opts: Parameters<typeof showSavedToast>[0],
  confirm = false,
): Promise<void> {
  try {
    const result = await restoreRevision(opts.entity, opts.id, opts.savedVersion - 1, {
      expectedVersion: opts.savedVersion,
      ...(confirm ? { confirm: true } : {}),
    });
    toast.success("Өмнөх хувилбар руу буцаалаа");
    opts.onUndone?.(result);
  } catch (e) {
    // Сурагч өгсөн тестийн хариуг буцаах — хөтчийн confirm биш, хоёр дахь
    // мэдэгдлийн товчоор батлуулна (дизайны гэрээ; хөтчийн цонх блоклогдож болно).
    const warning = confirmRequiredOf(e);
    if (warning) {
      toast.warning(warning, {
        duration: 15_000,
        action: { label: "Хариуг ч буцаах", onClick: () => void undoSave(opts, true) },
      });
      return;
    }
    const conflict = versionConflictOf(e);
    toast.error(
      conflict
        ? `${conflict.message} тул буцааж чадсангүй. «Түүх»-ээс хувилбараа сонгоно уу.`
        : e instanceof Error && e.message
          ? e.message
          : "Буцааж чадсангүй",
    );
  }
}

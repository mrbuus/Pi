/**
 * Дүн шивэх торны НҮДНИЙ түвшний нэгтгэл (docs/v2/ZEREG-ZASVAR-TOLOVLOGOO.md §3).
 *
 * Хоёр багш нэг ангийн дүнг зэрэг шивж болно (жиш: нэг нь 1–20, нөгөө нь 21–40-р
 * бодлогыг шалгана). Багш ачаалснаасаа хойш ӨӨРӨӨ өөрчилсөн нүдийг л бичнэ — тэр
 * хооронд бусдын оруулсан нүд хэвээр үлдэнэ. base байхгүй (Excel импорт) бол мөрийг
 * бүхэлд нь солино. Цэвэр функц (gradebook-merge.spec.ts).
 */

export interface GradebookRowState {
  /** 0 (буруу/хариулаагүй) тавьсан зүйлсийн түлхүүр */
  wrong: string[];
  absent: boolean;
}

export interface MergedGradebookRow extends GradebookRowState {
  /** Багш ачаалснаас хойш өөр хүн энэ мөрийг өөрчилсөн (нэгтгэлийн мэдэгдэлд) */
  merged: boolean;
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  const x = new Set(a);
  const y = new Set(b);
  return x.size === y.size && [...x].every((k) => y.has(k));
}

export function mergeGradebookRow(
  mine: GradebookRowState,
  base: GradebookRowState | undefined,
  current: GradebookRowState,
): MergedGradebookRow {
  if (!base)
    return {
      wrong: [...new Set(mine.wrong)].sort(),
      absent: mine.absent,
      merged: false,
    };
  const baseWrong = new Set(base.wrong);
  const mineWrong = new Set(mine.wrong);
  const added = [...mineWrong].filter((k) => !baseWrong.has(k));
  const removed = [...baseWrong].filter((k) => !mineWrong.has(k));
  const wrong = new Set(current.wrong);
  for (const k of added) wrong.add(k);
  for (const k of removed) wrong.delete(k);
  const cellsChanged = added.length + removed.length > 0;
  // Ирээгүй: энэ багш сольсон бол түүнийх; нүд шивсэн бол ирсэн; эс бөгөөс одоогийнх.
  const absent =
    mine.absent !== base.absent
      ? mine.absent
      : cellsChanged
        ? false
        : current.absent;
  return {
    wrong: absent ? [] : [...wrong].sort(),
    absent,
    merged:
      current.absent !== base.absent || !sameSet(current.wrong, base.wrong),
  };
}

import { findRoomConflict, roomCounts, type RoomSlot } from './room-overlap';

// «Танхим солих» (эзэн 2026-10-22): хоёр анги нэг танхимд давхцвал блоклохын
// оронд хоёр ангийн танхимыг заасан огнооноос эхлэн СОЛЬЖ өгнө. ЦЭВЭР логик.

export class RoomSwapError extends Error {}

/**
 * `a` (засаж буй анги) шинэ утгаараа `b`-ийн танхимд орох гэж байгаа. Солих
 * боломжтой эсэхийг шалгана; боломжгүй бол RoomSwapError (монгол мессежтэй).
 * - өөр өөр анги, хоёулаа бодит танхимтай (Онлайн/хоосон биш)
 * - `a` одоогийн танхимаасаа ӨӨР танхим руу орох ба тэр нь `b`-ийнх
 * - `a`-ийн шинэ цаг, хугацаа `b`-тэй үнэхээр давхцаж байх (давхцалгүй бол солих шаардлагагүй)
 */
export function assertCanSwap(
  aNew: RoomSlot,
  aOldRoom: string | null,
  b: RoomSlot,
): void {
  if (aNew.classroomId === b.classroomId)
    throw new RoomSwapError(
      'Нэг ангийн хоёр хичээлийн танхимыг солих боломжгүй',
    );
  if (!roomCounts(aOldRoom) || !roomCounts(b.room))
    throw new RoomSwapError('Хоёр анги хоёулаа танхимтай байх ёстой');
  if (aNew.room !== b.room)
    throw new RoomSwapError(
      'Солих танхим нөгөө ангийн танхимтай таарахгүй байна',
    );
  if (aOldRoom === b.room)
    throw new RoomSwapError('Хоёр анги аль хэдийн нэг танхимд байна');
  if (!findRoomConflict(aNew, [b]))
    throw new RoomSwapError('Энэ танхимд давхцал байхгүй тул шууд сольж болно');
}

/** Хоёр ангийн шинэ танхим: a → b-ийн танхим, b → a-гийн хуучин танхим */
export function swappedRooms(aOldRoom: string, bRoom: string) {
  return { aRoom: bRoom, bRoom: aOldRoom };
}

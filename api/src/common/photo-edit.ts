/**
 * Илгээсэн зургаа (онол, гэрийн даалгавар) сурагч өөрөө устгах / солих хугацаа
 * (эзэн 2026-11-12): илгээснээс хойш 5 минут. Дараа нь зөвхөн багш «Буцаах» дарвал
 * (гэрийн даалгавар) дахин илгээнэ.
 */
export const PHOTO_EDIT_MINUTES = 5;

export function photoEditable(sentAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - sentAt.getTime() <= PHOTO_EDIT_MINUTES * 60_000;
}

export const PHOTO_EDIT_CLOSED = `Илгээснээс хойш ${PHOTO_EDIT_MINUTES} минут өнгөрсөн тул зургаа өөрчлөх боломжгүй.`;

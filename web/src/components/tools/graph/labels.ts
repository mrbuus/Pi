/* ============================================================================
 * Зургийн шошгыг давхцалгүй байрлуулах (react-гүй, тестлэгдэнэ).
 *
 * Цэг бүрийн эргэн тойронд 8 боломжит байрлал (баруун дээд → зүүн дээд →
 * баруун доод …) туршиж, өмнө тавьсан шошго, хориглосон тэгш өнцөгт
 * (жишээ нь тэнхлэгийн шошго), зургийн хүрээтэй давхцахгүй эхнийхийг авна.
 * Багтахгүй шошгыг алгасна — давхцсан тоо харуулахаас хоосон нь дээр.
 * ========================================================================== */

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LabelReq {
  /** зангуу цэг (px) */
  px: number;
  py: number;
  /** шошгоны өргөн, өндөр (px) */
  w: number;
  h: number;
}

export interface Placed extends Box {
  /** text-anchor="start"-ийн суурь цэг */
  tx: number;
  ty: number;
}

/** Ойролцоо бичвэрийн өргөн: serif тоо ~0.55em, хаалт/таслал нарийн */
export function textWidth(s: string, size: number): number {
  let w = 0;
  for (const ch of s) w += /[()\-;.,:\s]/.test(ch) ? 0.33 : /[−]/.test(ch) ? 0.6 : 0.56;
  return w * size;
}

const overlap = (a: Box, b: Box, pad = 2) =>
  a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

/**
 * @param reqs  байрлуулах шошгууд (чухлыг нь эхэнд)
 * @param area  зургийн хэмжээ
 * @param blocked  шошго тавьж болохгүй тэгш өнцөгтүүд
 * @returns reqs-тэй ижил урттай; багтаагүй бол null
 */
export function placeLabels(reqs: LabelReq[], area: { w: number; h: number }, blocked: Box[] = [], gap = 6): (Placed | null)[] {
  const taken: Box[] = [...blocked];
  return reqs.map((r) => {
    const d = gap;
    const cands: [number, number][] = [
      [d, -d - r.h], // баруун дээд
      [-d - r.w, -d - r.h], // зүүн дээд
      [d, d], // баруун доод
      [-d - r.w, d], // зүүн доод
      [-r.w / 2, -d - r.h - 2], // шууд дээр
      [-r.w / 2, d + 2], // шууд доор
      [d + 2, -r.h / 2], // баруун
      [-d - 2 - r.w, -r.h / 2], // зүүн
    ];
    for (const [ox, oy] of cands) {
      const b: Box = { x: r.px + ox, y: r.py + oy, w: r.w, h: r.h };
      if (b.x < 2 || b.y < 2 || b.x + b.w > area.w - 2 || b.y + b.h > area.h - 2) continue;
      if (taken.some((t) => overlap(t, b))) continue;
      taken.push(b);
      return { ...b, tx: b.x, ty: b.y + b.h / 2 };
    }
    return null;
  });
}

/** Тоог шошгонд: бүхэлд ойр бол бүхэл, үгүй бол ≤2 орон (хэт олон оронгүй) */
export function shortNum(v: number): string {
  if (!Number.isFinite(v)) return "";
  const r = Math.round(v);
  if (Math.abs(v - r) < 5e-4) return String(r).replace("-", "−");
  const s = String(Number(v.toFixed(2)));
  return s.replace("-", "−");
}

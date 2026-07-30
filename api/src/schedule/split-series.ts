import { addDateDays } from '../common/date';

/**
 * "Энэ ба цаашдын бүх хичээл"-ийг өөрчлөх ЦЭВЭР логик.
 *
 * АСУУДАЛ: давтагдах хуваарийн цаг/өдрийг шууд PATCH хийвэл өөрчлөлт нь
 * УРАГШАА БАС ХОЙШОО үйлчилнэ — өнгөрсөн 3 сарын ирц, гэрийн даалгаврын
 * бүртгэл гэнэт "өөр цагт болсон" мэт харагдана. Түүхийг гуйвуулах нь
 * сургалтын байгууллагад хүлээн зөвшөөрөгдөхгүй.
 *
 * ШИЙДЭЛ (Google Calendar-ийн "this and following events" конвенц):
 * хуучин мөрийг заасан огнооны ӨМНӨХ өдөр дуусгаж (effectiveTo), шинэ утгатай
 * мөрийг тэр огнооноос эхлүүлнэ (effectiveFrom). Ингэснээр өнгөрсөн үе хэвээр
 * үлдэж, зөвхөн ирээдүй өөрчлөгдөнө.
 */

export interface SeriesWindow {
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

export type SplitPlan =
  /** Заасан огноо цувралын эхлэлээс өмнө/тэнцүү — салгах шаардлагагүй,
   *  бүх цувралыг шууд шинэчилнэ. */
  | { kind: 'REPLACE_ALL' }
  /** Цувралыг хоёр хуваана. */
  | {
      kind: 'SPLIT';
      /** Хуучин мөрийн шинэ төгсгөл (заасан огнооны өмнөх өдөр) */
      oldEffectiveTo: Date;
      /** Шинэ мөрийн эхлэл (заасан огноо) */
      newEffectiveFrom: Date;
      /** Шинэ мөр хуучин цувралын төгсгөлийг өвлөнө */
      newEffectiveTo: Date | null;
    };

export class SplitOutOfRangeError extends Error {}

/**
 * Салгалтын төлөвлөгөө гаргана.
 *
 * @param existing одоо байгаа цувралын хүчинтэй хугацаа
 * @param from    аль огнооноос эхлэн шинэ утга үйлчлэх
 */
export function planSplit(existing: SeriesWindow, from: Date): SplitPlan {
  if (existing.effectiveTo && from > existing.effectiveTo) {
    throw new SplitOutOfRangeError(
      'Заасан огноо энэ хуваарийн хүчинтэй хугацаанаас хойш байна',
    );
  }

  // Цувралын эхлэлээс өмнө (эсвэл яг эхэлж буй өдөр) бол хуваах утгагүй —
  // бүхэлд нь өөрчилнө. Эс бөгөөс "0 өдөр үргэлжлэх" хоосон хуучин мөр үлдэнэ.
  if (from <= existing.effectiveFrom) return { kind: 'REPLACE_ALL' };

  return {
    kind: 'SPLIT',
    oldEffectiveTo: addDateDays(from, -1),
    newEffectiveFrom: from,
    newEffectiveTo: existing.effectiveTo,
  };
}

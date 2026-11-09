/**
 * Зөөлөн устгалын нийтлэг туслах (эзний дүрэм 2026-10-23: прод өгөгдлийг ХЭЗЭЭ Ч
 * устгахгүй — «устгах» = deletedAt). Уншилт бүр `deletedAt: null`-ээр шүүнэ;
 * `src/schedule/soft-delete*.spec.ts`-ийн эх кодын хамгаалалт үүнийг шалгана.
 */

/** «Устгах» үйлдлийн `data` — хэн, хэзээ. */
export function softDeleteData(actorId: string | null | undefined) {
  return { deletedAt: new Date(), deletedById: actorId ?? null };
}

/**
 * LessonTopic (scheduleId, date) UNIQUE хэвээр тул устсан мөрийг ижил өдөр дахин
 * тавихад СЭРГЭЭНЭ. Хуучин төлөвлөгөө (тест, тарах/үлдэх, зураг, сэдэв) шинэ
 * мөрөнд «амилахгүйн» тулд эхлээд эдгээр анхдагч утгаар дарна. Устгах үеийн бүтэн
 * өмнөх төлөв AuditLog-д (before) үлдсэн.
 */
export function LESSON_TOPIC_BLANK() {
  return {
    title: '',
    chapterId: null as string | null,
    testIds: [] as string[],
    customTopics: [] as string[],
    dismissMode: null as string | null,
    photoStudentId: null as string | null,
    deletedAt: null,
    deletedById: null,
  };
}

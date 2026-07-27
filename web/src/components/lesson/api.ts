import { api, getToken } from "@/lib/api";
import type {
  LessonDetail,
  LessonProgressBody,
} from "./types";

/**
 * "Хичээл үзэх" (lesson) урсгалын API дуудлагууд — нэг дороос.
 *
 * 403 (эрхгүй) ба бусад алдааг (сүлжээ/сервер) ЗААВАЛ ялгаж таниулна: сурагч
 * "интернэт тасарсан" гэдгийг "энэ бүлгийг үзэх эрхгүй" гэдгээс ялгаж мэдэх
 * ёстой (эхнийх нь дахин оролдоход л шийдэгдэнэ, хоёр дахь нь эрх худалдаж
 * авах шаардлагатай). `api()` helper нь HTTP статусыг дамжуулдаггүй тул
 * (Бодлогын сан хуудасны fetchChapterProblems-тэй ижил зарчмаар) энд шууд
 * fetch хийж res.status шалгана.
 */
export class LessonAccessDeniedError extends Error {}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

export async function fetchLessonDetail(chapterId: string): Promise<LessonDetail> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}/lessons/${chapterId}`, { headers });
  } catch {
    throw new Error(
      "Сүлжээний алдаа — интернэт холболтоо шалгаад дахин оролдоно уу.",
    );
  }

  if (res.status === 403) {
    throw new LessonAccessDeniedError("энэ бүлгийг үзэх эрхгүй байна");
  }

  const data = (await res.json().catch(() => null)) as
    | LessonDetail
    | { message?: string | string[] }
    | null;

  if (!res.ok) {
    const message =
      data && !("chapter" in (data as object))
        ? Array.isArray((data as { message?: string | string[] }).message)
          ? (data as { message?: string[] }).message!.join(", ")
          : (data as { message?: string }).message
        : undefined;
    throw new Error(message ?? `Алдаа ${res.status}`);
  }

  return data as LessonDetail;
}

export async function postLessonProgress(
  chapterId: string,
  body: LessonProgressBody,
): Promise<void> {
  await api(`/lessons/${chapterId}/progress`, { method: "POST", body });
}

// Chapter нээхэд LearningEvent-д тэмдэглэнэ (Wave 1-ийн /events batch API-г
// дахин ашиглана — шинэ endpoint зохиогоогүй). Chirping/blocking биш тул
// алдаа гарвал л дуугүй өнгөрнө (аналитик, критик функц биш).
export async function logChapterOpened(chapterId: string): Promise<void> {
  try {
    await api("/events", {
      method: "POST",
      body: {
        events: [
          {
            type: "CHAPTER_OPENED",
            occurredAt: new Date().toISOString(),
            chapterId,
          },
        ],
      },
    });
  } catch {
    /* аналитик лог — сурагчийн урсгалыг блоклохгүй */
  }
}

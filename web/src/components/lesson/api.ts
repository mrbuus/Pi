import { api, ApiError } from "@/lib/api";
import type {
  LessonDetail,
  LessonProgressBody,
} from "./types";

// Preserve the distinction between missing access and connectivity failures.
export class LessonAccessDeniedError extends Error {}

export async function fetchLessonDetail(chapterId: string): Promise<LessonDetail> {
  try {
    return await api<LessonDetail>("/lessons/" + encodeURIComponent(chapterId));
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      throw new LessonAccessDeniedError("энэ бүлгийг үзэх эрхгүй байна");
    }
    throw error;
  }
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

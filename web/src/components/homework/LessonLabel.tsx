import MathText from "@/components/MathText";
import { Meta } from "@/components/ui/Meta";

/**
 * Даалгавар ӨГСӨН хичээл (анги + өдөр) — эзэн 2026-10-27. Сурагч ном, бүлэг,
 * сэдэв сонгохгүй. API (`lesson`) шошгыг угсарч өгнө:
 *   сэдэв мэдэгдэж байвал «10-р сарын 26» + CSS цэг (Meta) + «Логарифм тэгшитгэл 4-5»
 *   үгүй бол «10-р сарын 26-ны даалгавар»
 * Сурагчийн карт, багшийн шалгах карт хоёулаа ЭНЭ компонентыг ашиглана.
 */
export interface HomeworkLesson {
  date: string;
  weekday: string;
  dateText: string;
  topic: string | null;
  /** Бүтэн мөр (« — » тусгаарлагчтай) — aria-label, title-д */
  label: string;
}

export function LessonLabel({
  lesson,
  fallback,
}: {
  lesson?: HomeworkLesson | null;
  /** Хуучин API хариунд `lesson` байхгүй бол (ж: даалгаврын гарчиг) */
  fallback: string;
}) {
  if (!lesson) return <MathText>{fallback}</MathText>;
  if (!lesson.topic) return <>{lesson.label}</>;
  return (
    <Meta
      items={[
        <span key="d" className="whitespace-nowrap">
          {lesson.dateText}
        </span>,
        <MathText key="t">{lesson.topic}</MathText>,
      ]}
    />
  );
}

/** «Даваа гараг» — тайлбар мөрөнд */
export function lessonWeekday(lesson?: HomeworkLesson | null): string | null {
  return lesson ? `${lesson.weekday} гараг` : null;
}

/**
 * Багшийн бичсэн даалгаврын нэр шошготой давхцахгүй бол л тусад нь харуулна
 * (сэдэвтэй ижил эсвэл хоосон бол нуух).
 */
export function extraTitle(
  title: string | null | undefined,
  lesson?: HomeworkLesson | null,
): string | null {
  const t = (title ?? "").trim();
  if (!t || !lesson) return null;
  if (lesson.topic && t === lesson.topic.trim()) return null;
  return t;
}

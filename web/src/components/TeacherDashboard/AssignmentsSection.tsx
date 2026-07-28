"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TeacherHomeworkCalendar, {
  formatMnDate,
  ubDateKey,
  ubToday,
  ubWeekdayFull,
} from "@/components/homework/TeacherHomeworkCalendar";
import TeacherHomeworkFrequencyPanel from "@/components/homework/TeacherHomeworkFrequencyPanel";
import TeacherHomeworkTestCard from "@/components/homework/TeacherHomeworkTestCard";

interface Assignment {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  // API нь listForClass-д submission тоог хамт буцаадаг (assignments.service.ts),
  // гэхдээ эцэг компонентын локал төрөл үүнийг зарладаггүй тул сонголттой —
  // байхгүй үед л карт дээр тоог зүгээр л харуулахгүй.
  _count?: { submissions: number };
}

interface SubmissionRow {
  student: { id: string; firstName: string; lastName: string };
  state: string;
  note: string | null;
}

interface AssignmentsSectionProps {
  assignments: Assignment[];
  submissions: SubmissionRow[];
  openAssignmentId: string;
  newTitle: string;
  onNewTitleChange: (title: string) => void;
  onCreate: () => void;
  onOpen: (assignmentId: string) => void;
  onReview: (studentId: string, action: string) => void;
}

/**
 * Даалгавартай холбоотой үйлдлүүд (үүсгэх, нээх, шалгах).
 * Багш даалгавар өгж, оюутны илгээлтийг шалгана.
 *
 * Онцлогууд (owner-ийн хүсэлтээр):
 *  - 📅 Хуанли — сар/өдрөөр сонгож өмнөх хичээлүүдийн даалгаврыг эргэн харна
 *  - 🎯 Шинэ даалгаврын нэрийг өмнөх хичээлээс автоматаар бөглөнө (засварлаж болно)
 *  - 📦 Тест бүр өөрийн жижиг боксд тус тусад нь харагдана
 *  - 🎨 Давтамжийн анхааруулга (3+/5+ хийгээгүй/дутуу, сүүлийн 2 тэмдэглээгүй)
 */
export default function AssignmentsSection({
  assignments,
  submissions,
  openAssignmentId,
  newTitle,
  onNewTitleChange,
  onCreate,
  onOpen,
  onReview,
}: AssignmentsSectionProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDate, setSelectedDate] = useState(ubToday);

  const handleCreate = async () => {
    setIsCreating(true);
    await onCreate();
    setIsCreating(false);
  };

  // ==========================================================================
  // 🎯 Автоматаар бөглөх: өмнөх хичээлийн (өнөөдрөөс өмнөх хамгийн сүүлийн
  // өдрийн) даалгаврын нэрийг эхэнд нь санал болгоно, багш чөлөөтэй засна.
  // ==========================================================================
  const todayKey = ubToday();
  const prevLessonTitle = useMemo(() => {
    const prev = assignments.find((a) => ubDateKey(a.createdAt) !== todayKey);
    return prev?.title ?? null;
  }, [assignments, todayKey]);

  const autoFilledRef = useRef(false);
  useEffect(() => {
    if (autoFilledRef.current) return;
    if (prevLessonTitle && !newTitle.trim()) {
      onNewTitleChange(prevLessonTitle);
      autoFilledRef.current = true;
    }
    // onNewTitleChange нь эцэг компонентын setState-той холбоотой, дахин
    // үүсдэг тул dependency-д оруулбал давхар/эргэлдэх эффект үүсгэнэ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevLessonTitle]);

  const isPrefilled = !!prevLessonTitle && newTitle === prevLessonTitle;

  // ==========================================================================
  // 📅 Сонгосон өдрийн тестүүд (хуанлиас сонгосон)
  // ==========================================================================
  const dayAssignments = useMemo(
    () => assignments.filter((a) => ubDateKey(a.createdAt) === selectedDate),
    [assignments, selectedDate],
  );

  return (
    <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
      <h2 className="mb-4 font-bold text-brand-soft">Даалгаврууд</h2>

      {/* Create New Assignment */}
      <div className="mb-2">
        {prevLessonTitle && (
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-ink-dim">
            <span aria-hidden="true">🔁</span>
            <span>
              Өмнөх хичээлээс: <span className="font-medium">“{prevLessonTitle}”</span>
              {isPrefilled && " (автоматаар бөглөгдсөн)"}
            </span>
            {!isPrefilled && (
              <button
                type="button"
                onClick={() => onNewTitleChange(prevLessonTitle)}
                className="min-h-6 rounded-full border border-line px-2 py-0.5 font-semibold text-brand-soft transition hover:bg-brand-tint"
              >
                Дахин ашиглах
              </button>
            )}
          </div>
        )}
        <div className="flex flex-col gap-2 md:flex-row md:gap-2">
          <input
            value={newTitle}
            onChange={(e) => onNewTitleChange(e.target.value)}
            placeholder="Шинэ даалгаврын нэр…"
            className="flex-1 rounded-lg border border-line bg-ink/5 px-3 py-2 text-sm outline-none focus:border-brand-bright"
            disabled={isCreating}
          />
          <button
            onClick={handleCreate}
            disabled={isCreating || !newTitle.trim()}
            className="rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold transition disabled:opacity-50 md:whitespace-nowrap"
          >
            {isCreating ? "Үүсгэж байна..." : "Өгөх"}
          </button>
        </div>
      </div>

      {/* 🎨 Давтамжийн анхааруулга */}
      <div className="my-4">
        <TeacherHomeworkFrequencyPanel assignments={assignments} />
      </div>

      {/* 📅 Хуанли + сонгосон өдрийн тестүүд */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,280px)_1fr]">
        <TeacherHomeworkCalendar
          assignments={assignments}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        <div>
          <h3 className="mb-1 text-sm font-bold">
            {formatMnDate(selectedDate)},{" "}
            <span className="text-brand-soft">
              {ubWeekdayFull(selectedDate)}
            </span>
          </h3>
          <p className="mb-3 text-xs text-ink-dim">
            {dayAssignments.length > 0
              ? `${dayAssignments.length} тест өгсөн`
              : "Энэ өдөр тест өгөөгүй байна"}
          </p>

          {dayAssignments.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {dayAssignments.map((assignment) => (
                <TeacherHomeworkTestCard
                  key={assignment.id}
                  assignment={assignment}
                  isOpen={openAssignmentId === assignment.id}
                  submissions={
                    openAssignmentId === assignment.id ? submissions : []
                  }
                  // ⚠️ Эцэг компонент (TeacherDashboardClient.tsx) "хаах" төлөвийг
                  // дэмждэггүй — onOpen(id) нь үргэлж roster татаж НЭЭЛТТЭЙ болгодог,
                  // хоосон id дамжуулбал API замд алдаа өгнө. Тиймээс энд зөвхөн
                  // "нээх/дахин ачаалах" боломжтой, анхны AssignmentsSection-тэй ижил.
                  onToggle={() => onOpen(assignment.id)}
                  onReview={onReview}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

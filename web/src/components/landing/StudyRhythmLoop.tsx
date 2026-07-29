import { BookOpenCheck, CalendarCheck, NotebookPen, PenLine } from "lucide-react";

// CentreInfo-ийн CLASS_RHYTHM_POINTS-д тодорхойлсон мөчлөгийг (хичээл →
// даалгавар → орой тэмдэглэл → сар бүрийн шалгалт → ахиц хараад дахин
// эхэлнэ) өгүүлбэрээр биш, хөдөлгөөнөөр харуулна. Зорилтот сэдвийг
// текстээр тайлбарлахаас илүү мөчлөгийн зураглал үзэгчид илүү хурдан
// ойлгуулна гэж үзсэн (эзний "хөдөлгөөн, харилцан үйлчлэл" зарчим).
const STEPS = [
  { icon: BookOpenCheck, label: "Хичээл" },
  { icon: NotebookPen, label: "Даалгавар" },
  { icon: PenLine, label: "Орой тэмдэглэл" },
  { icon: CalendarCheck, label: "Сар бүрийн шалгалт" },
] as const;

export default function StudyRhythmLoop() {
  return (
    <div
      role="img"
      className="reveal mt-10 rounded-2xl border border-line bg-panel p-6 md:p-8"
      aria-label="Сурах хэмнэлийн мөчлөг: хичээл, даалгавар, орой тэмдэглэл, сар бүрийн шалгалт — дараа нь дахин хичээлээс эхэлнэ"
    >
      <div className="relative">
        {/* Суурь зам */}
        <div className="absolute left-0 right-0 top-6 h-0.5 rounded-full bg-line md:top-7" />
        {/* Эргэлддэг гэрэлтэх зурвас */}
        <div
          aria-hidden
          className="loop-sweep absolute left-0 top-6 h-0.5 rounded-full bg-brand md:top-7"
        />

        <div className="relative grid grid-cols-4 gap-2">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex flex-col items-center text-center">
              <div
                aria-hidden
                className="loop-node flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface text-brand md:h-14 md:w-14"
                style={{ animationDelay: `${i * -2}s` }}
              >
                <s.icon size={20} strokeWidth={2.25} />
              </div>
              <span
                aria-hidden
                className="loop-label mt-2.5 text-[11px] leading-tight sm:text-xs"
                style={{ animationDelay: `${i * -2}s` }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

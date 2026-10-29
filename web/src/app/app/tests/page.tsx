"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { LoadingState } from "@/components/ui/StateBlock";
import { api, getRole } from "@/lib/api";
import ContinueBanner from "@/components/test-list/ContinueBanner";
import ClassBoard from "@/components/exams/ClassBoard";
import ExamsBoard from "@/components/exams/ExamsBoard";
import StudentExamLists from "@/components/exams/StudentExamLists";
import StudentExamsHub from "@/components/exams/StudentExamsHub";
import TopicGroup from "@/components/test-list/TopicGroup";
import {
  collapseVariants,
  isExamType,
  splitTopic,
  SUBJECTS,
  type GroupRow,
  type Tab,
  type TestRow,
} from "@/components/test-list/types";

/* ============================================================================
 * Шалгалтын жагсаалт — сэдвээр бүлэглэсэн, 2 ангилалтай, хайлт+хичээлийн
 * шүүлттэй.
 *
 * - «Тест» = авто дүнтэй, онлайнаар өгч болно; «Шалгалт» = багш дүгнэдэг (цаасан)
 * - Сэдэв (ерөнхий гарчиг) → задлахад 1,2,3… дугаартай тестүүд дарааллаараа
 * - Хайлт: сэдвийн нэр болон тестийн нэрээр шүүнэ (таарсан сэдэв автоматаар нээгдэнэ)
 * - Хичээлийн шүүлт (?subject=) сервер дээр хийгдэнэ — Математик/Нийгмийн ухаан
 * - А/Б хувилбарууд: сурагчид зөвхөн өөрт «оноогдсон» нэгийг харна, багш бүгдийг
 *   харна, тодорхой "Хувилбар А/Б" пилл-ээр (Аудит: variant-ыг санамсаргүй
 *   онооддог логик алга гэсэн дутагдлын frontend fix)
 * - Дуусаагүй (IN_PROGRESS) сесстэй бол — сэдвийн бүлэг рүү орж хайлгүйгээр,
 *   хамгийн дээр том зурвасаар шууд буцаж орно
 * - Сэдвийн бүлгүүдийг хуудаслана (backend /tests нь skip/take дэмждэггүй тул
 *   render-ийг энд хязгаарлаж, DOM хэт томрохоос сэргийлнэ)
 * ========================================================================== */

// Хуудаслалт: /tests нь skip/take дэмждэггүй тул сэдвийн бүлгүүдийг энд
// зүсэж, "Дараагийнхыг харах" товчоор нэмнэ (DOM хэт томрохоос сэргийлнэ).
const PAGE_SIZE = 20;

const noopSubscribe = () => () => {};

export default function TestsPage() {
  // Эрх localStorage-д — серверийн HTML ба эхний клиент рендер ижил байхын тулд
  // hydration-ий дараа л уншина (сурагч, ажилтан өөр мод рендерлэнэ)
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!mounted) return <LoadingState rows={3} />;
  const role = getRole();
  // Сурагч, худалдан авагч — нэг «Шалгалт» хэсэг (Өгөх, Өгсөн, Эрэмбэ, Жишиг сорил)
  if (role === "STUDENT" || role === "BUYER") return <StudentExamsHub />;
  return <StaffTestsView role={role} />;
}

function StaffTestsView({ role }: { role: string | null }) {
  const isTeacher = role === "ADMIN" || role === "TEACHER" || role === "TEACHER_PLUS";
  // «Шалгалт» табыг тусад нь харуулдаг (ажилтан — ExamsBoard, сурагч — Өгөх/Өгсөн)
  const isLearner = role === "STUDENT" || role === "BUYER";
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subject, setSubject] = useState("");
  // «Анги» — ажилтанд л (ангийн бүх шалгалтын дүн, ирц, явц)
  const [tab, setTab] = useState<Tab | "CLASS">("TEST");
  // Ажилтан ХОЁР табд хоёуланд нь ExamsBoard (мөр дэлгэрэх самбар) — эзэн
  // 2026-10-11: «Тест» таб ч мөн адил хялбар байх ёстой. Хуучин бүлгийн
  // жагсаалт зөвхөн сурагчийн «Тест» табд үлдэнэ.
  const ownView = isTeacher || (isLearner && tab === "EXAM");
  const [query, setQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [shownCount, setShownCount] = useState(PAGE_SIZE);
  const [studentId, setStudentId] = useState<string | null>(null);

  const loadTests = useCallback(() => {
    setLoading(true);
    setError("");
    // 1000 бодлогын шалгалт ч «Шалгалт» табд (тусдаа хэсэг байхгүй — эзэн 2026-10-10)
    api<TestRow[]>(`/tests?includeThousand=1${subject ? `&subject=${subject}` : ""}`)
      .then(setTests)
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Тестийн жагсаалт ачаалахад алдаа гарлаа");
      })
      .finally(() => setLoading(false));
  }, [subject]);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  useEffect(() => {
    // Хэрэглэгчийн ID — A/B хувилбар сонгоход; амжилтгүй бол чимээгүй орхино
    if (!isTeacher && role === "STUDENT") {
      api<{ id: string }>("/auth/me")
        .then((me) => setStudentId(me.id))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Шүүлт/хайлт өөрчлөгдөхөд хуудаслалтыг эхнээс нь эхлүүлнэ
  useEffect(() => {
    setShownCount(PAGE_SIZE);
    // Үндсэн ачаалалт эсвэл хайлт цэвэрлэхэд эхний сэдвийг автоматаар задлана
    setOpen(new Set());
  }, [tab, query, subject, topicFilter]);

  const q = query.trim().toLowerCase();

  // Таб + хайлтаар шүүгээд сэдвээр бүлэглэнэ; сурагчид А/Б хувилбарыг нэгтгэнэ.
  // Сэдвийн шүүлт (topicFilter) үүнээс тусдаа доор хийгдэнэ — dropdown-ий
  // сонголтуудыг тухайн таб/хайлтад тохирсон хэвээр байлгахын тулд.
  const { allGroups, testCount, examCount } = useMemo(() => {
    let testCount = 0;
    let examCount = 0;
    const map = new Map<string, GroupRow[]>();
    for (const t of tests) {
      // Ангилал ТӨРЛӨӨР: сэдвийн шалгалт/сорил = Шалгалт; дасгал = Тест
      const isExam = isExamType(t.type);
      if (isExam) examCount++;
      else testCount++;
      if ((tab === "EXAM") !== isExam) continue;
      const { topic, num } = splitTopic(t);
      if (q && !topic.toLowerCase().includes(q) && !t.title.toLowerCase().includes(q)) continue;
      if (!map.has(topic)) map.set(topic, []);
      map.get(topic)!.push({ row: t, num });
    }
    // Сэдэв дотроо: дугаараар, дараа нь хувилбараар (1-A, 1-B, 2-A…)
    for (const rows of map.values()) {
      rows.sort(
        (a, b) =>
          (a.num ?? 1e9) - (b.num ?? 1e9) ||
          (a.row.variantLabel ?? "").localeCompare(b.row.variantLabel ?? ""),
      );
    }
    const allGroups = [...map.entries()]
      .map(([topic, rows]) => [topic, isTeacher ? rows : collapseVariants(rows, studentId)] as const)
      .sort(([a], [b]) => a.localeCompare(b, "mn"));
    return { allGroups, testCount, examCount };
  }, [tests, tab, q, isTeacher, studentId]);

  // Сэдвийн шүүлт — багшид (100+ мөр үед) хамгийн хэрэгтэй, гэхдээ сурагчид ч
  // хориглохгүй.
  const groups = topicFilter ? allGroups.filter(([topic]) => topic === topicFilter) : allGroups;
  const visibleGroups = groups.slice(0, shownCount);
  const hasMore = groups.length > visibleGroups.length;

  function toggle(topic: string) {
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      {/* Толгой: гарчиг + хайлт + хичээл + сэдэв */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-ink">Шалгалт</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <label htmlFor="test-search" className="sr-only">
              Сэдэв, тестээр хайх
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim"
            />
            <input
              id="test-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Сэдэв, тестээр хайх…"
              className="h-11 w-56 rounded-xl border border-line bg-bg py-2 pl-9 pr-3 text-sm text-ink outline-none transition focus:border-brand sm:w-72"
            />
          </div>
          <label htmlFor="test-subject" className="sr-only">
            Хичээл шүүх
          </label>
          <select
            id="test-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-11 rounded-xl border border-line bg-bg px-3 text-sm text-ink outline-none focus:border-brand"
          >
            {SUBJECTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {/* Сэдвийн шүүлт — ялангуяа багшид олон зуун тест дундаас хайхад.
              Ажилтны «Шалгалт» табд оронд нь Цуврал/Анги/Төлөв (ExamsBoard). */}
          {allGroups.length > 1 && !ownView && (
            <>
              <label htmlFor="test-topic" className="sr-only">
                Сэдэв шүүх
              </label>
              <select
                id="test-topic"
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                className="h-11 max-w-[12rem] rounded-xl border border-line bg-bg px-3 text-sm text-ink outline-none focus:border-brand"
              >
                <option value="">Бүх сэдэв</option>
                {allGroups.map(([topic]) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </>
          )}
          {isTeacher && (
            <Link
              href="/app/tests/new"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-4 text-sm font-bold text-on-brand transition hover:opacity-90"
            >
              + Тест үүсгэх
            </Link>
          )}
        </div>
      </div>

      {/* Дуусаагүй сесс — сурагч тасарсан бол шууд буцаж орох зам (сэдэв бүлэг,
          хайлт, хуудаслалтаас үл хамааран, ХАМГИЙН дээр) */}
      {!isTeacher && !loading && !error && <ContinueBanner tests={tests} />}

      {/* Хоёр ангилал: Тест (сэдвийн дасгал) / Шалгалт (сэдвийн шалгалт, сорил) */}
      <div className="flex gap-2">
        {(
          [
            { key: "TEST", label: "Тест", count: testCount, hint: "сэдвийн дасгал" },
            { key: "EXAM", label: "Шалгалт", count: examCount, hint: "сэдвийн шалгалт, сорил" },
            ...(isTeacher ? ([{ key: "CLASS", label: "Анги", count: null, hint: "дүн, ирц, явц" }] as const) : []),
          ] as const
        ).map((tb) => (
          <button
            key={tb.key}
            onClick={() => {
              setTab(tb.key);
              // Таб солигдоход тухайн табд байхгүй болсон сэдвийн шүүлтийг цэвэрлэнэ
              setTopicFilter("");
            }}
            aria-pressed={tab === tb.key}
            className={`min-h-11 rounded-xl border px-4 py-2.5 text-sm transition ${
              tab === tb.key
                ? "border-brand-bright bg-brand-bright/15 text-brand-soft"
                : "border-line text-ink-dim hover:border-brand"
            }`}
          >
            <span className="font-bold">{tb.label}</span>
            {/* Сурагчийн шалгалтын тоо Өгөх/Өгсөн жагсаалтад (дүнтэй бүх шалгалт орно) */}
            {tb.count !== null && !(isLearner && tb.key === "EXAM") && (
              <span className="ml-1.5 rounded-full bg-line/40 px-2 py-0.5 text-xs text-ink">
                {tb.count}
              </span>
            )}
            <span className="ml-2 hidden text-xs opacity-70 sm:inline">{tb.hint}</span>
          </button>
        ))}
      </div>

      {/* Ажилтны «Шалгалт» таб: бүлэг, 3 шүүлтүүр, мөр дэлгэрэхэд Тойм/Дүн/Бодлого/Тохиргоо */}
      {/* key={tab}: таб солигдоход шүүлтүүр, нээлттэй мөр шинээр эхэлнэ */}
      {isTeacher && tab !== "CLASS" && <ExamsBoard key={tab} kind={tab} query={query} subject={subject} />}
      {isTeacher && tab === "CLASS" && <ClassBoard />}

      {/* Сурагчийн «Шалгалт»: Өгөх (оноогдсон/худалдаж авсан) · Өгсөн (оноо) */}
      {isLearner && tab === "EXAM" && <StudentExamLists studentId={studentId} query={query} />}

      {/* Ачаалж байгаа төлөв — скелетон, "тест алга" мессежээс тодорхой ялгаатай */}
      {!ownView && loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              aria-hidden="true"
              className="h-16 animate-pulse chunky"
            />
          ))}
          <p role="status" className="sr-only">
            Тестийн жагсаалт ачаалж байна…
          </p>
        </div>
      )}

      {/* Алдааны төлөв — жинхэнэ алдаа, дахин оролдох боломжтой (.catch(()=>{})-той
          андуурагдахгүй, ялгаатай харагдана) */}
      {!ownView && !loading && error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
        >
          <span>Жагсаалт ачаалж чадсангүй: {error}</span>
          <button
            onClick={loadTests}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-error/40 px-3 text-xs font-semibold transition hover:bg-error/10"
          >
            Дахин оролдох
          </button>
        </div>
      )}

      {/* Хоосон төлөв — зөвхөн алдаагүй үед; хайлт vs бодит хоосон ялгана */}
      {!ownView && !loading && !error && groups.length === 0 && (
        <p className="chunky p-6 text-center text-sm text-ink-dim">
          {q || topicFilter
            ? `«${query || topicFilter}» гэсэн шүүлтэд таарах зүйл алга`
            : tests.length === 0
              ? "Тест хараахан үүсгээгүй байна"
              : "Энэ ангилалд тест алга байна"}
        </p>
      )}

      {/* Сэдвийн бүлгүүд */}
      {!ownView && !loading && !error && groups.length > 0 && (
        <div className="space-y-3">
          {visibleGroups.map(([topic, rows], idx) => (
            <TopicGroup
              key={topic}
              topic={topic}
              rows={rows}
              isTeacher={isTeacher}
              expanded={q !== "" || open.has(topic) || (idx === 0 && q === "")}
              onToggle={() => toggle(topic)}
            />
          ))}

          {hasMore && (
            <button
              onClick={() => setShownCount((c) => c + PAGE_SIZE)}
              className="min-h-11 w-full rounded-xl border border-line py-3 text-sm font-semibold text-ink-dim transition hover:border-brand hover:text-ink"
            >
              Дараагийн {Math.min(PAGE_SIZE, groups.length - shownCount)} сэдвийг харах
              {" — "}
              {groups.length - shownCount} үлдсэн
            </button>
          )}
        </div>
      )}
    </div>
  );
}

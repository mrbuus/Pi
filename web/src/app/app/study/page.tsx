"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FlaskConical,
  History,
} from "lucide-react";
import { api, fileUrl, getRole } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/kit/card";
import MathText from "@/components/MathText";
import StudyTask, { Task } from "@/components/study/StudyTask";
import {
  isStudyLearner,
  studyMode,
  restoredStudyTask,
  answerRecordLabel,
  correctnessLabel,
  independentCorrectRecords,
} from "@/components/study/study-policy";
import TheoryReader from "@/components/study/TheoryReader";
type RecordRow = {
  id: string;
  problemId: string;
  kind: string;
  correct?: boolean | null;
  flags?: string[];
  mode?: string;
  at: string;
  answer?: string;
};
type Assignment = {
  id: string;
  title: string;
  description?: string;
  imageKeys: string[];
  myStatus: string;
  dueDate?: string;
};
type Recommendation = {
  problemId: string;
  reason: string;
  explanation?: string;
  uncertainty?: string;
  evidence?: {
    independentAttempts: number;
    independentCorrect: number;
    corrected: number;
    guessedOrHelped: number;
    selfReported: number;
    unknown: number;
    repeated: number;
  };
};
type Activity = {
  year: number;
  totalActiveDays: number;
  days: { date: string; count: number }[];
};
type Chapter = { id: string; title: string };
const ADVANCED_FAMILIES = [
  ["vector-dot", "3 хэмжээст векторын скаляр үржвэр"],
  ["derivative-value", "Олон гишүүнтийн уламжлалын цэг дэх утга"],
  ["integral-definite", "Олон гишүүнтийн тодорхой интеграл"],
];
const FAMILIES = [
  ["linear", "Шугаман тэгшитгэл"],
  ["quadratic", "Квадрат тэгшитгэл"],
  ["fractions", "Бутархайн нийлбэр"],
];
export default function StudyPage() {
  const [asOf, setAsOf] = useState(0);
  const [task, setTask] = useState<Task | null>(null),
    [mode, setMode] = useState("independent"),
    [family, setFamily] = useState("linear"),
    [bankCode, setBankCode] = useState("");
  const [history, setHistory] = useState<RecordRow[]>([]),
    [assignments, setAssignments] = useState<Assignment[]>([]),
    [recommendations, setRecommendations] = useState<Recommendation[]>([]),
    [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [failures, setFailures] = useState<string[]>([]),
    [allowed, setAllowed] = useState(true),
    [activity, setActivity] = useState<Activity | null>(null);
  async function load() {
    if (!isStudyLearner(getRole())) {
      setAllowed(false);
      setLoading(false);
      return;
    }
    setAllowed(true);
    setLoading(true);
    setAsOf(Date.now());
    const result = await Promise.allSettled([
      api<RecordRow[]>("/learning-lab/history"),
      getRole() === "STUDENT"
        ? api<Assignment[]>("/assignments/my")
        : Promise.resolve<Assignment[]>([]),
      api<Recommendation[]>("/recommend/next?limit=3"),
      api<Chapter[]>("/lessons/chapters"),
      getRole() === "STUDENT"
        ? api<Activity>("/activity/me")
        : Promise.resolve<Activity | null>(null),
    ]);
    const missing: string[] = [];
    if (result[0].status === "fulfilled") setHistory(result[0].value);
    else missing.push("Бодсон түүх");
    if (result[1].status === "fulfilled") setAssignments(result[1].value);
    else missing.push("Даалгавар");
    if (result[2].status === "fulfilled") setRecommendations(result[2].value);
    else missing.push("Дасгалын санал");
    if (result[3].status === "fulfilled") setChapters(result[3].value);
    else missing.push("Онолын сэдэв");
    if (result[4].status === "fulfilled") setActivity(result[4].value);
    else missing.push("Жилийн идэвх");
    setFailures(missing);
    setLoading(false);
  }
  // Өгөгдөл татахыг requestAnimationFrame-д боож болохгүй: нуугдсан таб дээр
  // браузер frame гаргахгүй тул callback ажиллахгүй, хуудас skeleton дээрээ
  // гацна. useEffect өөрөө paint-ийн дараа ажилладаг тул хойшлуулах хэрэггүй.
  useEffect(() => {
    void load();
    const query = new URLSearchParams(window.location.search);
    const saved = query.get("task");
    const savedMode = query.get("mode");
    const path = restoredStudyTask(getRole(), saved);
    if (path) {
      setMode(studyMode(getRole(), savedMode));
      setBusy(true);
      void api<Task>(path)
        .then(setTask)
        .catch(() => setError("Өмнөх бодлого нээгдсэнгүй. Дахин оролдоно уу."))
        .finally(() => setBusy(false));
    }
  }, []);
  async function start(id?: string, probeFamily?: string, forcedMode?: string) {
    if (!isStudyLearner(getRole())) {
      setAllowed(false);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const nextMode = studyMode(
        getRole(),
        forcedMode ?? (probeFamily ? "probe" : mode),
      );
      const nextFamily = probeFamily ?? family;
      let seed = crypto.getRandomValues(new Uint32Array(1))[0];
      while (
        history.some((r) => r.problemId === `lab-v1:${nextFamily}:${seed}`)
      )
        seed = (seed + 1) >>> 0;
      const next = await api<Task>(
        id
          ? `/learning-lab/bank/${encodeURIComponent(id)}`
          : `/learning-lab/problem?family=${nextFamily}&seed=${seed}`,
      );
      setMode(nextMode);
      setTask(next);
      const query = new URLSearchParams({
        task: next.id,
        mode: nextMode,
      });
      window.history.replaceState(null, "", `/app/study?${query}`);
    } catch {
      setError("Бодлого нээгдсэнгүй. Холболтоо шалгаад дахин оролдоно уу.");
    } finally {
      setBusy(false);
    }
  }
  if (task)
    return (
      <StudyTask
        key={task.id}
        task={task}
        mode={mode}
        onClose={() => {
          setTask(null);
          window.history.replaceState(null, "", "/app/study");
          void load();
        }}
      />
    );
  if (!allowed)
    return (
      <main className="mx-auto max-w-xl p-5 text-ink">
        <h1 className="text-xl font-semibold">Сурах хэсэг</h1>
        <p className="mt-3">
          Сурагч эсвэл худалдан авагчийн бүртгэлээр сурах урсгалаа нээнэ үү.
        </p>
        <Button asChild variant="outline">
          <Link href="/app">Нүүр рүү</Link>
        </Button>
      </main>
    );
  const first = history.filter((r) => r.kind === "first");
  const independent = independentCorrectRecords(history);
  const assisted = history.filter(
    (r) => r.kind === "solution-assisted-correction",
  );
  const due = first.find(
    (r) =>
      r.problemId.startsWith("lab-v1:") && asOf - Date.parse(r.at) >= 86400000,
  );
  return (
    <main className="mx-auto max-w-xl space-y-5 p-4 pb-24 text-ink">
      <header>
        <h1 className="cyrillic-heading text-2xl font-semibold">
          Өнөөдөр сурах
        </h1>
        <p className="mt-2 text-sm text-ink-dim">
          Нэг бодлогоос эхэл. Хариултаа хадгалаад, дахин бодож, дараа нь
          тайлбараа үзээрэй.
        </p>
      </header>
      <details className="rounded-xl border border-line p-4">
        <summary className="min-h-11 cursor-pointer font-medium">
          Сэдвээ сонгон хугацаатай давтах
        </summary>
        <p className="my-3 text-sm text-ink-dim">
          10, 30 эсвэл 60 минут. Бүртгэгдээгүй, шалгасан түлхүүртэй эрхтэй
          бодлогууд; эхний хариулт серверт хадгалагдана.
        </p>
        <Link
          href="/app/study/review"
          className="inline-flex min-h-11 items-center gap-2 text-brand"
        >
          Давталт сонгох <ArrowRight size={18} />
        </Link>
      </details>
      {loading ? (
        <div className="space-y-3" aria-label="Сурах мэдээлэл ачаалж байна">
          <div className="skeleton h-44 rounded-xl" />
          <div className="skeleton h-28 rounded-xl" />
        </div>
      ) : (
        <>
          {failures.length > 0 && (
            <div
              role="status"
              className="rounded-lg border border-line p-3 text-sm"
            >
              {failures.join(", ")} түр нээгдсэнгүй. Хоосон гэдэг нь ахицгүй
              гэсэн үг биш.
              <Button variant="ghost" onClick={load}>
                Дахин оролдох
              </Button>
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical size={20} /> Нэг шинэ бодлого
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-ink-dim">
                Яг тооцоогоор шалгасан шинэ дасгал. Эх номын бодлого, шалгалтын
                онооноос тусдаа хадгална.
              </p>
              <label className="block">
                Бодох хэлбэр
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="mt-2 min-h-11 w-full rounded-lg border border-line bg-surface px-3"
                >
                  <option value="independent">Онлайн — тусламжгүй бодох</option>
                  {getRole() === "STUDENT" && (
                    <option value="classroom">
                      Танхим — дэвтрийн эхний хариулт
                    </option>
                  )}
                </select>
              </label>
              <label className="block">
                Сэдэв
                <select
                  value={family}
                  onChange={(e) => setFamily(e.target.value)}
                  className="mt-2 min-h-11 w-full rounded-lg border border-line bg-surface px-3"
                >
                  {FAMILIES.map(([v, t]) => (
                    <option key={v} value={v}>
                      {t}
                    </option>
                  ))}
                  <optgroup label="Ахисан — хязгаарласан дасгал">
                    {ADVANCED_FAMILIES.map(([value, title]) => (
                      <option key={value} value={value}>
                        {title}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
              <Button
                className="w-full"
                disabled={busy}
                onClick={() => start()}
              >
                Эхлэх <ArrowRight size={18} />
              </Button>
              {mode === "classroom" && (
                <p className="text-sm text-ink-dim">
                  Энэ нь шинээр үүсгэсэн дасгал. Хичээлийн бодлогоо тэмдэглэхдээ
                  доорх багшийн бодлогоос сонгоно уу.
                </p>
              )}
            </CardContent>
          </Card>
          {error && (
            <p role="alert" className="text-error">
              {error}
            </p>
          )}
          {due && (
            <Card>
              <CardContent className="pt-5 space-y-3">
                <h2 className="font-semibold">Өмнөх сэдвээ санаж байна уу?</h2>
                <p className="text-sm text-ink-dim">
                  Нэг хоногийн дараа ижил сэдвийн шинэ бодлогоор шалгаж болно.
                  Энэ хугацаа бол туршилтын санал.
                </p>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setMode("probe");
                    void start(undefined, due.problemId.split(":")[1]);
                  }}
                >
                  Тусламжгүй шалгах
                </Button>
              </CardContent>
            </Card>
          )}
          {getRole() === "STUDENT" && (
            <details className="rounded-xl border border-line bg-surface p-4">
              <summary className="min-h-11 cursor-pointer font-semibold flex items-center gap-2">
                <ClipboardCheck size={18} /> Хичээлийн дараах даалгавар
              </summary>
              <div className="mt-3 space-y-4">
                <p className="text-sm text-ink-dim">
                  Анги дээр утас хэрэглэхгүй. Гэртээ дэвтэрт анх бичсэн
                  хариултаа тэмдэглээрэй.
                </p>
                {!assignments.length && (
                  <p>
                    Одоогоор даалгавар харагдахгүй байна. Багш нэмсний дараа энд
                    гарна.
                  </p>
                )}
                {assignments.slice(0, 5).map((a) => (
                  <article
                    key={a.id}
                    className="border-t border-line pt-3 space-y-2"
                  >
                    <h3 className="font-semibold">{a.title}</h3>
                    {a.description && <MathText>{a.description}</MathText>}
                    <p className="text-sm text-ink-dim">
                      Төлөв:{" "}
                      {a.myStatus === "NOT_DONE"
                        ? "Илгээгээгүй"
                        : a.myStatus === "SUBMITTED"
                          ? "Шалгуулахаар илгээсэн"
                          : a.myStatus === "RETURNED"
                            ? "Дахин илгээх"
                            : "Шалгасан"}
                    </p>
                    {a.imageKeys.map((key) => (
                      <a
                        key={key}
                        href={fileUrl(key)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block min-h-11 text-brand underline"
                      >
                        Даалгаврын эх нээх
                      </a>
                    ))}
                  </article>
                ))}
                <Button asChild variant="outline">
                  <Link href="/app/student">Даалгавраа илгээх</Link>
                </Button>
              </div>
            </details>
          )}
          <details className="rounded-xl border border-line bg-surface p-4">
            <summary className="min-h-11 cursor-pointer font-semibold">
              Багшийн сангийн бодлого
            </summary>
            <div className="mt-3 space-y-2">
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void start(
                    bankCode.trim(),
                    undefined,
                    getRole() === "STUDENT" ? "classroom" : "independent",
                  );
                }}
              >
                <label className="block">
                  Бодлогын яг ID
                  <input
                    className="mt-2 min-h-11 w-full rounded-lg border border-line bg-surface px-3"
                    value={bankCode}
                    onChange={(e) => setBankCode(e.target.value)}
                    placeholder="Бодлогын сангаас хуулсан ID"
                    maxLength={160}
                  />
                </label>
                <Button
                  type="submit"
                  disabled={busy || !bankCode.trim()}
                  variant="outline"
                >
                  Эхний хариултаа тэмдэглэх
                </Button>
              </form>
              <p className="text-sm text-ink-dim">
                Санал нь өмнөх оролдлогын мэдээлэлд тулгуурладаг; чадварын
                баталгаатай дүгнэлт биш.
              </p>
              {recommendations.map((r, i) => (
                <div key={r.problemId} className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={busy}
                    onClick={() => start(r.problemId, undefined, "independent")}
                  >
                    Санал болгосон бодлого {i + 1}
                    <ArrowRight size={16} />
                  </Button>
                  {r.explanation && (
                    <p className="text-sm text-ink-dim">{r.explanation}</p>
                  )}
                  {r.evidence && (
                    <details className="text-sm text-ink-dim">
                      <summary>
                        Өмнөх баримт: {r.evidence.independentAttempts} бие
                        даасан хэмжсэн хариулт
                      </summary>
                      <p>
                        Бие даан зөв: {r.evidence.independentCorrect} /{" "}
                        {r.evidence.independentAttempts}
                      </p>
                      <p>
                        Зассан: {r.evidence.corrected}; таасан / тусламжтай:{" "}
                        {r.evidence.guessedOrHelped}; өөрийн тэмдэглэгээ:{" "}
                        {r.evidence.selfReported}; үнэлгээ тодорхойгүй:{" "}
                        {r.evidence.unknown}; давтан: {r.evidence.repeated}
                      </p>
                      <p>
                        Эдгээр нь ажигласан баримт; чадварын баталгаатай онош
                        болон ЭЕШ-ын магадлал биш.
                      </p>
                    </details>
                  )}
                </div>
              ))}
              {!recommendations.length && (
                <p className="text-sm">
                  Бодлогын санал хараахан байхгүй. Сэдвийн хичээл эсвэл шинэ
                  дасгалаас эхлээрэй.
                </p>
              )}
              <Button asChild variant="ghost">
                <Link href="/app/practice">Бүх дасгал</Link>
              </Button>
            </div>
          </details>
          <div className="grid grid-cols-2 gap-3">
            <Button asChild variant="outline" className="min-h-14">
              <Link href="/app/tests">
                <ClipboardCheck size={18} /> Сэдвийн тест
              </Link>
            </Button>
            <Button asChild variant="outline" className="min-h-14">
              <Link href="/app/online">
                <CalendarDays size={18} /> Долоо хоногийн сорил
              </Link>
            </Button>
          </div>
          <details className="rounded-xl border border-line bg-surface p-4">
            <summary className="min-h-11 cursor-pointer font-semibold flex gap-2 items-center">
              <BookOpen size={18} /> Онол, зураг, баримт
            </summary>
            <div className="mt-3">
              {chapters.length ? (
                <TheoryReader chapters={chapters} />
              ) : (
                <p>
                  Хичээл хараахан байхгүй. Эрхтэй сэдэв нэмэгдсэнээр энд гарна.
                </p>
              )}
            </div>
          </details>
          <details className="rounded-xl border border-line bg-surface p-4">
            <summary className="min-h-11 cursor-pointer font-semibold flex gap-2 items-center">
              <History size={18} /> Бодсон түүх ба ахиц
            </summary>
            <div className="mt-3 space-y-3">
              {activity && (
                <p className="text-sm">
                  {activity.year} онд эх сангийн бодлого бодсон{" "}
                  {activity.totalActiveDays} өдөр. Шинэ дасгалын тэмдэглэгээг
                  доор тусад нь харуулна.
                </p>
              )}
              <p className="text-sm">
                Сүүлийн 100 үйлдэлд: бие даан гэж тэмдэглэсэн эхний зөв хариулт{" "}
                {independent.length}; бодолт үзсэн засвар {assisted.length}.
              </p>
              <p className="text-sm text-ink-dim">
                Энд сурах урсгалын тэмдэглэл харагдана. Өөр сувгаар өмнө бодсон
                эсэхийг энэ жагсаалтаас дүгнэхгүй. Энэ нь бүрэн чадварын үнэлгээ
                биш. Хурд дангаараа чадварыг тодорхойлохгүй. Нээлттэй таб
                анхаарч байгааг батлахгүй.
              </p>
              {!history.length && (
                <p>Эхний хариултаа хадгалмагц бодит түүх энд үүснэ.</p>
              )}
              {first.slice(0, 10).map((r) => (
                <div key={r.id} className="border-t border-line pt-2">
                  <p className="text-sm">
                    {new Date(r.at).toLocaleDateString("mn-MN")} —{" "}
                    {r.mode === "classroom"
                      ? "Дэвтрийн тэмдэглэгээ"
                      : r.mode === "probe"
                        ? "Хугацааны дараах шалгалт"
                        : "Бие даасан оролдлого"}{" "}
                    — {correctnessLabel(r.correct)}
                  </p>
                  <MathText>
                    {r.answer?.trim() ? `$${r.answer}$` : answerRecordLabel(r)}
                  </MathText>
                  {!!r.flags?.length && (
                    <p className="text-xs text-ink-dim">
                      Өөрийн тэмдэглэгээ:{" "}
                      {r.flags
                        .map(
                          (flag) =>
                            (
                              ({
                                unsure: "Эргэлзсэн",
                                guessed: "Таасан",
                                help: "Тусламж авсан",
                                "could-not": "Бодож чадаагүй",
                              }) as Record<string, string>
                            )[flag] ?? flag,
                        )
                        .join(", ")}
                    </p>
                  )}
                  {history.some(
                    (event) =>
                      event.problemId === r.problemId &&
                      [
                        "retry-before-solution",
                        "solution-assisted-correction",
                      ].includes(event.kind),
                  ) && (
                    <details className="mt-2 text-sm">
                      <summary>Дараах засварууд</summary>
                      {history
                        .filter(
                          (event) =>
                            event.problemId === r.problemId &&
                            [
                              "retry-before-solution",
                              "solution-assisted-correction",
                            ].includes(event.kind),
                        )
                        .slice(0, 5)
                        .map((event) => (
                          <div key={event.id} className="space-y-1 py-2">
                            <p>
                              {event.kind === "solution-assisted-correction"
                                ? "Тайлбар нээсний дараах засвар"
                                : "Тайлбар нээхээс өмнөх давтан хариулт"}{" "}
                              — {correctnessLabel(event.correct)}
                            </p>
                            <MathText>
                              {event.answer?.trim()
                                ? `$${event.answer}$`
                                : answerRecordLabel(event)}
                            </MathText>
                          </div>
                        ))}
                    </details>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="link">
                  <Link href="/app/readiness">Бэлэн байдал</Link>
                </Button>
                <Button asChild variant="link">
                  <Link href="/app/mistakes">Алдааны дэвтэр</Link>
                </Button>
                <Button asChild variant="link">
                  <Link href="/app/formulas">Томьёо</Link>
                </Button>
                <Button asChild variant="link">
                  <Link href="/app/insights">Урт хугацааны ахиц</Link>
                </Button>
              </div>
            </div>
          </details>
        </>
      )}
    </main>
  );
}

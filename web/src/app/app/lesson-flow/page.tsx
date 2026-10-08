"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Save } from "lucide-react";
import { api, fileUrl } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import { Card, CardContent } from "@/components/ui/kit/card";
import MathText from "@/components/MathText";
type Choice = { id: string; title: string };
type Preview = {
  homeworkImageKeys: string[];
  homeworkDueDate: string | null;
  packet: {
    id: string;
    homeworkAssignmentId: string | null;
    makeupTestId: string | null;
    photoTurn: { studentId: string; reason: string } | null;
  } | null;
  chapter: Choice & {
    theories: (Choice & { imageKeys: string[] })[];
    tests: Choice[];
  };
  counters: {
    classSize: number;
    theorySubmitted: number | null;
    classTestSubmitted: number;
    homeworkSubmitted: number;
  };
  prefill: { title: string; description: string };
  photoCandidates: { studentId: string; firstName: string; lastName: string }[];
  rotation: { studentId: string; firstName: string; lastName: string }[];
  makeupPupils: { studentId: string; firstName: string; lastName: string }[];
  limitations: string[];
};
export default function LessonFlowPage() {
  const [classes, setClasses] = useState<
      { id: string; name: string; teacher: { id: string } }[]
    >([]),
    [chapters, setChapters] = useState<Choice[]>([]),
    [classId, setClassId] = useState(""),
    [chapterId, setChapterId] = useState(""),
    [date, setDate] = useState(() =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar" }).format(
        new Date(),
      ),
    ),
    [preview, setPreview] = useState<Preview | null>(null),
    [testId, setTestId] = useState(""),
    [makeupTestId, setMakeupTestId] = useState(""),
    [overridePupil, setOverridePupil] = useState(""),
    [overrideReason, setOverrideReason] = useState(""),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [due, setDue] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    Promise.all([
      api<typeof classes>("/classrooms"),
      api<{ id: string; role: string }>("/auth/me"),
      api<Choice[]>("/lessons/chapters"),
    ])
      .then(([rows, me, lessons]) => {
        setClasses(
          rows.filter((r) => me.role === "ADMIN" || r.teacher?.id === me.id),
        );
        setChapters(lessons);
      })
      .catch(() => setError("Анги эсвэл сэдэв нээгдсэнгүй."));
  }, []);
  async function open() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const p = await api<Preview>(
        `/lesson-flow/classrooms/${encodeURIComponent(classId)}/preview?date=${date}&chapterId=${encodeURIComponent(chapterId)}`,
      );
      setPreview(p);
      setTitle(p.prefill.title);
      setDescription(p.prefill.description);
      setTestId("");
      setMakeupTestId(p.packet?.makeupTestId ?? "");
      setDue(p.homeworkDueDate ? p.homeworkDueDate.slice(0, 10) : "");
    } catch {
      setError("Өдрийн мэдээлэл нээгдсэнгүй.");
    } finally {
      setBusy(false);
    }
  }
  async function recordTest() {
    setBusy(true);
    setError("");
    try {
      await api(`/classrooms/${encodeURIComponent(classId)}/did-test`, {
        method: "POST",
        body: JSON.stringify({ testId, date }),
      });
      setMessage(
        "Ангид хийсэн тест бүртгэгдлээ. Гэрийн даалгаврыг доор шалгаж тохируулна уу.",
      );
      const t = preview?.chapter.tests.find((t) => t.id === testId);
      if (t)
        setDescription(
          `Онол: ${preview?.chapter.title}\nАнгид хийсэн тест: ${t.title}\nБодлого: `,
        );
    } catch {
      setError("Тест бүртгэгдсэнгүй.");
    } finally {
      setBusy(false);
    }
  }
  async function createHomework() {
    setBusy(true);
    setError("");
    try {
      const packet = await api<NonNullable<Preview["packet"]>>(
        `/lesson-flow/classrooms/${encodeURIComponent(classId)}/day?date=${date}`,
        {
          method: "PUT",
          body: JSON.stringify({
            chapterId,
            ...(testId ? { testId } : {}),
            makeupTestId: makeupTestId || null,
            homework: {
              title,
              description,
              imageKeys: preview?.homeworkImageKeys ?? [],
              ...(due ? { dueDate: due } : {}),
            },
          }),
        },
      );
      setPreview((prev) => (prev ? { ...prev, packet } : prev));
      setTitle("");
      setMessage(
        "Даалгавар үүслээ. Сурагчид одоо байгаа даалгаврын хэсгээс илгээнэ.",
      );
    } catch {
      setError("Даалгавар үүссэнгүй.");
    } finally {
      setBusy(false);
    }
  }
  async function assignTurn() {
    if (!preview?.packet) return;
    setBusy(true);
    try {
      const turn = await api<{ studentId: string; reason: string }>(
        `/lesson-flow/days/${preview.packet.id}/photo-turn`,
        {
          method: "POST",
          body: JSON.stringify(
            overridePupil
              ? { studentId: overridePupil, reason: overrideReason }
              : {},
          ),
        },
      );
      setPreview((prev) =>
        prev?.packet
          ? { ...prev, packet: { ...prev.packet, photoTurn: turn } }
          : prev,
      );
      setMessage("Зураг авах ээлж хадгалагдлаа.");
    } catch {
      setError("Ирцээ тэмдэглээд дахин оролдоно уу.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <BookOpen size={22} /> Хичээлийн өдөр
      </h1>
      <p className="text-sm text-muted-foreground">
        Онол → ангид хийсэн тест → багшийн тохируулсан гэрийн даалгавар.
      </p>
      <Card>
        <CardContent className="space-y-3 pt-4">
          <label className="block">
            Анги
            <select
              className="block w-full rounded border bg-background p-2"
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setPreview(null);
              }}
            >
              <option value="">Сонгох</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Өдөр
            <input
              type="date"
              className="block w-full rounded border bg-background p-2"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPreview(null);
              }}
            />
          </label>
          <label className="block">
            Сэдэв
            <select
              className="block w-full rounded border bg-background p-2"
              value={chapterId}
              onChange={(e) => {
                setChapterId(e.target.value);
                setPreview(null);
              }}
            >
              <option value="">Сонгох</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <Button disabled={busy || !classId || !chapterId} onClick={open}>
            Өдрийн мэдээлэл нээх
          </Button>
        </CardContent>
      </Card>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <Link href="/app/lesson-flow/my" className="text-primary underline">
        Сурагчийн хичээлийн өдөр
      </Link>
      {preview && (
        <>
          <Card>
            <CardContent className="space-y-2 pt-4">
              {preview.packet && (
                <>
                  <p>Өдрийн багц хадгалагдсан.</p>
                  <details>
                    <summary>Ээлжийг багш өөрөө тохируулах</summary>
                    <select
                      className="w-full rounded border bg-background p-2"
                      value={overridePupil}
                      onChange={(e) => setOverridePupil(e.target.value)}
                    >
                      <option value="">Автомат дараалал</option>
                      {preview.photoCandidates.map((p) => (
                        <option key={p.studentId} value={p.studentId}>
                          {p.lastName} {p.firstName}
                        </option>
                      ))}
                    </select>
                    <label>
                      Шалтгаан
                      <input
                        className="w-full rounded border bg-background p-2"
                        maxLength={500}
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                      />
                    </label>
                  </details>
                  <Button
                    onClick={assignTurn}
                    disabled={
                      busy || (!!overridePupil && !overrideReason.trim())
                    }
                  >
                    Зураг авах ээлж батлах
                  </Button>
                  {preview.packet.photoTurn && (
                    <p>
                      Ээлж батлагдсан:{" "}
                      {preview.photoCandidates.find(
                        (p) =>
                          p.studentId === preview.packet?.photoTurn?.studentId,
                      )?.firstName ?? "Сурагч"}{" "}
                      · {preview.packet.photoTurn.reason}
                    </p>
                  )}
                </>
              )}
              <p>Анги: {preview.counters.classSize} сурагч</p>
              <p>
                Онолын зураг:{" "}
                {preview.counters.theorySubmitted ?? "бүртгэл холбоогүй"} /{" "}
                {preview.counters.classSize}
              </p>
              <p>
                Ангийн тестээ тэмдэглэсэн / илгээсэн: {preview.counters.classTestSubmitted} /{" "}
                {preview.counters.classSize}
              </p>
              <p>
                Даалгавар илгээсэн: {preview.counters.homeworkSubmitted} /{" "}
                {preview.counters.classSize}
              </p>
              <details>
                <summary>Онол ба зураг авах ээлжийн санал</summary>
                {preview.chapter.theories.map((t) => (
                  <div key={t.id}>
                    <MathText>{t.title}</MathText>
                    {t.imageKeys.map((k) => (
                      <a
                        className="block text-primary underline"
                        key={k}
                        href={fileUrl(k)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Онолын зураг / PDF нээх
                      </a>
                    ))}
                  </div>
                ))}
                <p>Ирц нь ирсэн / хоцорсон гэж тэмдэглэгдсэн сурагчдаас:</p>
                {preview.rotation.map((p) => (
                  <p key={p.studentId}>
                    {p.lastName} {p.firstName}
                  </p>
                ))}
                {!preview.rotation.length && <p>Ирцээ эхлээд тэмдэглэнэ үү.</p>}
                <p>Нөхөх хичээл шаардлагатай:</p>
                {preview.makeupPupils.map((p) => (
                  <p key={p.studentId}>
                    {p.lastName} {p.firstName}
                  </p>
                ))}
              </details>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 pt-4">
              <h2 className="font-semibold">Ангид хийсэн тест</h2>
              <select
                value={testId}
                onChange={(e) => setTestId(e.target.value)}
                className="w-full rounded border bg-background p-2"
              >
                <option value="">Тест сонгох</option>
                {preview.chapter.tests.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              <label className="block">
                Тасалсан сурагчийн нөхөх A хувилбар (багш сонгоно)
                <select
                  className="block w-full rounded border bg-background p-2"
                  value={makeupTestId}
                  onChange={(e) => setMakeupTestId(e.target.value)}
                >
                  <option value="">Сонгоогүй</option>
                  {preview.chapter.tests.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </label>
              <Button disabled={busy || !testId} onClick={recordTest}>
                Тест бүртгэх
              </Button>
              <h2 className="font-semibold">
                Гэрийн даалгавар — автоматаар бөглөсөн саналыг тохируулах
              </h2>
              <label className="block">
                Гарчиг
                <input
                  className="block w-full rounded border bg-background p-2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label className="block">
                Бодлого ба тайлбар
                <textarea
                  className="block min-h-28 w-full rounded border bg-background p-2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <label className="block">
                Дуусах өдөр (20:00 Улаанбаатар)
                <input
                  type="date"
                  className="block w-full rounded border bg-background p-2"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                />
              </label>
              <Button disabled={busy || !title.trim()} onClick={createHomework}>
                <Save size={16} /> Өдрийн багц ба даалгавар хадгалах
              </Button>
              <Link
                className="block text-primary underline"
                href="/app/teacher"
              >
                Багшийн самбар — ирц ба хавсралт
              </Link>
            </CardContent>
          </Card>
          <details className="text-sm text-muted-foreground">
            <summary>Одоогийн хамрах хүрээ</summary>
            {preview.limitations.map((x) => (
              <p key={x}>{x}</p>
            ))}
          </details>
        </>
      )}
    </main>
  );
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Upload, BookOpen } from "lucide-react";
import { api, fileUrl, uploadFile } from "@/lib/api";
import MathText from "@/components/MathText";
import { Button } from "@/components/ui/kit/button";
import { Card, CardContent } from "@/components/ui/kit/card";
import { formatMnDateTime } from "@/lib/dateMn";
type Day = {
  id: string;
  date: string;
  chapter: { title: string };
  /** Хичээлээр нэрлэсэн шошго (эзэн 2026-10-27): «10-р сарын 26 — Сэдэв» */
  lesson?: { label: string } | null;
};
type Evidence = {
  id: string;
  kind?: string;
  imageKeys: string[];
  submittedAt: string;
};
type Detail = {
  packet: {
    id: string;
    makeupTestId: string | null;
    homeworkAssignmentId: string | null;
    testSessionId: string | null;
    photoTurn: { studentId: string } | null;
  };
  theories: {
    id: string;
    title: string;
    content: string;
    imageKeys: string[];
  }[];
  sharedTheoryPhotos: Evidence[];
  receipts: Evidence[];
};
export default function PupilLessonDay() {
  const [days, setDays] = useState<Day[]>([]),
    [detail, setDetail] = useState<Detail | null>(null),
    [selected, setSelected] = useState(""),
    [kind, setKind] = useState("THEORY"),
    [files, setFiles] = useState<File[]>([]),
    [keys, setKeys] = useState<string[]>([]),
    [requestId, setRequestId] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    api<Day[]>("/lesson-flow/my")
      .then(setDays)
      .catch(() => setError("Хичээлийн өдрүүд нээгдсэнгүй."));
  }, []);
  async function open(id: string) {
    setBusy(true);
    setError("");
    try {
      setDetail(await api<Detail>(`/lesson-flow/days/${id}`));
      setSelected(id);
      setFiles([]);
      const pending = sessionStorage.getItem(`lesson-receipt:${id}:${kind}`);
      if (pending) {
        const saved = JSON.parse(pending);
        setKeys(saved.imageKeys);
        setRequestId(saved.clientRequestId);
      } else {
        setKeys([]);
        setRequestId("");
      }
      setMessage("");
    } catch {
      setError("Энэ өдрийн материал нээгдсэнгүй.");
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (!detail) return;
    setBusy(true);
    setError("");
    try {
      let imageKeys = keys;
      if (!imageKeys.length) {
        imageKeys = [];
        for (const file of files) imageKeys.push((await uploadFile(file)).key);
        setKeys(imageKeys);
      }
      const clientRequestId = requestId || crypto.randomUUID();
      setRequestId(clientRequestId);
      sessionStorage.setItem(
        `lesson-receipt:${detail.packet.id}:${kind}`,
        JSON.stringify({ imageKeys, clientRequestId }),
      );
      await api(`/lesson-flow/days/${detail.packet.id}/receipts`, {
        method: "POST",
        body: JSON.stringify({ kind, imageKeys, clientRequestId }),
      });
      setDetail(await api<Detail>(`/lesson-flow/days/${detail.packet.id}`));
      setMessage(
        "Хавсралт хадгалагдлаа. Энэ нь илгээсэн баримт; зөв бодсон үнэлгээ биш.",
      );
      sessionStorage.removeItem(`lesson-receipt:${detail.packet.id}:${kind}`);
      setFiles([]);
      setKeys([]);
      setRequestId("");
    } catch {
      setError(
        "Илгээсэн нь батлагдсангүй. Дахин дарахад ижил баримтыг давхар үүсгэхгүй.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <BookOpen />
        Миний хичээлийн өдөр
      </h1>
      <p className="text-sm text-muted-foreground">
        Өдрийн онол, нөхөх тест, өөрийн илгээсэн хавсралтыг нээнэ.
      </p>
      <select
        className="w-full rounded border bg-background p-2"
        value={selected}
        onChange={(e) => open(e.target.value)}
      >
        <option value="">Өдрөө сонгох</option>
        {days.map((d) => (
          <option key={d.id} value={d.id}>
            {d.lesson?.label ?? `${d.date.slice(0, 10)} — ${d.chapter.title}`}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {!days.length && !error && (
        <p>Багш хадгалсан хичээлийн өдөр хараахан байхгүй.</p>
      )}
      {detail && (
        <>
          <Card>
            <CardContent className="space-y-3 pt-4">
              {detail.theories.map((t) => (
                <details key={t.id}>
                  <summary>{t.title}</summary>
                  <MathText>{t.content}</MathText>
                  {t.imageKeys.map((k) => (
                    <a
                      key={k}
                      className="block text-primary underline"
                      href={fileUrl(k)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Онолын зураг / PDF
                    </a>
                  ))}
                </details>
              ))}
              <details>
                <summary>Ангийн хуваалцсан онолын зургууд</summary>
                {detail.sharedTheoryPhotos.flatMap((r) =>
                  r.imageKeys.map((k) => (
                    <a
                      key={`${r.id}-${k}`}
                      className="block text-primary underline"
                      href={fileUrl(k)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {r.submittedAt.slice(0, 10)} — онолын зураг
                    </a>
                  )),
                )}
              </details>
              {detail.packet.makeupTestId && (
                <Link
                  className="block text-primary underline"
                  href={`/app/tests/${detail.packet.makeupTestId}`}
                >
                  Тасалсан өдрийн нөхөх A тест
                </Link>
              )}
              <Link
                href="/app/student#homework"
                className="block text-primary underline"
              >
                Багшийн гэрийн даалгавар
              </Link>
              <Link href="/app/study" className="block text-primary underline">
                Эхний хариултаа тэмдэглэх
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 pt-4">
              <label className="block">
                Илгээх баримт
                <select
                  className="block w-full rounded border bg-background p-2"
                  value={kind}
                  onChange={(e) => {
                    setKind(e.target.value);
                    setFiles([]);
                    const saved = sessionStorage.getItem(
                      `lesson-receipt:${selected}:${e.target.value}`,
                    );
                    if (saved) {
                      const pending = JSON.parse(saved);
                      setKeys(pending.imageKeys);
                      setRequestId(pending.clientRequestId);
                    } else {
                      setKeys([]);
                      setRequestId("");
                    }
                  }}
                >
                  <option value="THEORY">
                    Онолын зураг — ангид хуваалцана
                  </option>
                  <option value="CLASS_TEST">Ангид хийсэн тест — хувийн</option>
                  <option value="HOMEWORK">Гэрийн даалгавар — хувийн</option>
                  {detail.packet.makeupTestId && (
                    <option value="MAKEUP">Нөхөх A тест — хувийн</option>
                  )}
                </select>
              </label>
              <label className="block">
                Зураг / PDF (10 хүртэл)
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  disabled={busy}
                  onChange={(e) => {
                    setFiles(Array.from(e.target.files ?? []).slice(0, 10));
                    setKeys([]);
                    setRequestId("");
                  }}
                />
              </label>
              <p className="text-sm text-muted-foreground">
                Онолын зурагт зөвхөн сурах материалыг хавсаргана; бусдын нүүр,
                хувийн мэдээллийг бүү оруул.
              </p>
              <Button
                disabled={busy || (!files.length && !keys.length)}
                onClick={submit}
              >
                <Upload size={16} />
                Хавсралт илгээх
              </Button>
              <details>
                <summary>
                  Өмнөх илгээсэн баримтууд ({detail.receipts.length})
                </summary>
                {detail.receipts.map((r) => (
                  <div key={r.id}>
                    <p>
                      {r.kind} ·{" "}
                      {formatMnDateTime(r.submittedAt)}
                    </p>
                    {r.imageKeys.map((k) => (
                      <a
                        key={k}
                        className="block text-primary underline"
                        href={fileUrl(k)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Өөрийн хавсралт нээх
                      </a>
                    ))}
                  </div>
                ))}
              </details>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}

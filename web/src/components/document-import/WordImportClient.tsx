"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import MathText from "@/components/MathText";
import { api, getRole } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/kit/card";
type Warning = { code: string; message: string; sourceXml?: string };
type Block = {
  id: string;
  kind: "paragraph" | "table";
  text: string;
  sourceXml: string;
  warnings: Warning[];
  rows?: Block[][][];
};
type Preview = {
  version: 1;
  filename: string;
  blocks: Block[];
  warnings: Warning[];
  equationCount: number;
  canAutoImport: false;
  previewToken: string;
  sourceHash: string;
  expiresAt: string;
};
type Mapping = { prompt: string; choices: string[]; correct: string };
const initial: Mapping = { prompt: "", choices: ["", "", "", ""], correct: "" };
function PreviewBlock({ block }: { block: Block }) {
  return (
    <div className="space-y-2 rounded-lg border border-line p-3">
      <p className="text-sm text-ink-dim">{block.id}</p>
      {block.rows ? (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className="min-w-40 border border-line p-2 align-top"
                    >
                      {cell.map((b) => (
                        <PreviewBlock key={b.id} block={b} />
                      ))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto whitespace-pre-wrap">
          <MathText>{block.text}</MathText>
        </div>
      )}
      {block.warnings.map((w, i) => (
        <p className="text-sm text-warning" key={i}>
          {w.message}
        </p>
      ))}
      <details>
        <summary className="min-h-11 cursor-pointer text-sm text-ink-dim">
          Эх XML болон хөрвүүлсэн бичвэр
        </summary>
        <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all text-xs">
          {block.text}
          {"\n\n"}
          {block.sourceXml}
        </pre>
      </details>
    </div>
  );
}
export default function WordImportClient() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mapping, setMapping] = useState<Mapping>(initial);
  const [confirmed, setConfirmed] = useState(false);
  const [chapters, setChapters] = useState<
    {
      id: string;
      title: string;
      grade: number;
      book?: { title: string } | null;
    }[]
  >([]);
  const [chapterId, setChapterId] = useState("");
  const [imported, setImported] = useState<{
    problemId: string;
    duplicate: boolean;
  } | null>(null);
  const flatten = (blocks: Block[], inherited: Warning[] = []): Block[] =>
    blocks.flatMap((b) =>
      b.rows
        ? flatten(b.rows.flat(2), [
            ...inherited,
            ...b.warnings.filter((w) => w.code !== "TABLE_MAPPING"),
          ])
        : [{ ...b, warnings: [...inherited, ...b.warnings] }],
    );
  const selectable = preview
    ? flatten(preview.blocks).filter((b) => b.text.trim())
    : [];
  const chosen = (id: string) => selectable.find((b) => b.id === id);
  const ids = [mapping.prompt, ...mapping.choices.filter(Boolean)].filter(
    Boolean,
  );
  const valid =
    !!mapping.prompt &&
    mapping.choices.filter(Boolean).length >= 2 &&
    !!mapping.correct &&
    mapping.choices.includes(mapping.correct) &&
    new Set(ids).size === ids.length &&
    ids.every((id) => chosen(id)?.warnings.length === 0);
  useEffect(() => {
    const authorized = ["ADMIN", "TEACHER_PLUS"].includes(getRole() ?? "");
    setAllowed(authorized);
    if (authorized)
      api<typeof chapters>("/chapters")
        .then(setChapters)
        .catch((e) =>
          setError(
            e instanceof Error ? e.message : "Бүлэг сэдвийг уншиж чадсангүй.",
          ),
        );
  }, []);
  async function upload() {
    setError("");
    setBusy(true);
    setPreview(null);
    setConfirmed(false);
    setMapping(initial);
    setImported(null);
    try {
      if (!file || !/\.docx$/i.test(file.name) || file.size > 10 * 1024 * 1024)
        throw new Error("10 МБ-аас ихгүй .docx файл сонгоно уу.");
      const form = new FormData();
      form.append("file", file);
      setPreview(
        await api<Preview>("/document-import/preview", {
          method: "POST",
          body: form,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Баримтыг уншиж чадсангүй.");
    } finally {
      setBusy(false);
    }
  }
  async function persist() {
    if (!preview || !valid || !confirmed || !chapterId) return;
    setBusy(true);
    setError("");
    try {
      setImported(
        await api<{ problemId: string; duplicate: boolean }>(
          "/document-import/confirm",
          {
            method: "POST",
            body: {
              previewToken: preview.previewToken,
              chapterId,
              confirmed: true,
              warningsAcknowledged: true,
              mapping: {
                promptId: mapping.prompt,
                choiceIds: mapping.choices.filter(Boolean),
                correctChoiceId: mapping.correct,
              },
            },
          },
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Бодлогыг хадгалж чадсангүй.");
    } finally {
      setBusy(false);
    }
  }
  function download() {
    if (!preview || !valid || !confirmed) return;
    const draft = {
      version: 1,
      status: "reviewed-local-draft",
      source: preview.filename,
      question: {
        prompt: chosen(mapping.prompt)!.text,
        choices: mapping.choices.filter(Boolean).map((id) => ({
          text: chosen(id)!.text,
          isCorrect: id === mapping.correct,
        })),
        sourceBlockIds: ids,
      },
      originalPreview: preview,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "word-question-review.json";
    link.click();
    URL.revokeObjectURL(url);
  }
  const select = (
    label: string,
    value: string,
    change: (id: string) => void,
  ) => (
    <label htmlFor={`word-map-${label}`} className="block space-y-1">
      <span className="text-sm">{label}</span>
      <select
        id={`word-map-${label}`}
        className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-ink"
        value={value}
        onChange={(e) => {
          change(e.target.value);
          setConfirmed(false);
          setImported(null);
        }}
      >
        <option value="">Сонгоно уу</option>
        {selectable.map((b) => (
          <option key={b.id} value={b.id} disabled={b.warnings.length > 0}>
            {b.id}: {b.text.slice(0, 100)}
            {b.warnings.length ? " — шалгах" : ""}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 text-ink sm:p-6">
      <Link
        href="/app/teacher"
        className="inline-flex min-h-11 items-center text-brand"
      >
        ← Буцах
      </Link>
      <h1 className="cyrillic-heading text-2xl font-semibold">
        Word бодлого оруулах
      </h1>
      <p className="text-ink-dim">
        Word Equation томьёог хөрвүүлж, эх баримттай тулган шалгана. Зургийг
        гараар хавсаргана. Урьдчилсан харагдац хадгалахгүй. Шалгаж
        баталгаажуулсны дараа сонгосон нэг бодлогыг санд оруулна.
      </p>
      {allowed === null ? (
        <div
          className="h-24 animate-pulse rounded-lg bg-panel"
          aria-label="Эрхийг шалгаж байна"
        />
      ) : !allowed ? (
        <p role="alert">Энэ хэрэгсэл багш+ болон админ эрх шаарддаг.</p>
      ) : (
        <>
          <Card>
            <CardContent className="space-y-3 pt-6">
              <label className="block space-y-2">
                <span>DOCX файл (10 МБ хүртэл)</span>
                <input
                  type="file"
                  accept=".docx"
                  className="block min-h-11 w-full"
                  disabled={busy}
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null);
                    setPreview(null);
                  }}
                />
              </label>
              <Button onClick={upload} disabled={!file || busy}>
                {busy ? "Баримтыг уншиж байна…" : "Урьдчилан харах"}
              </Button>
              {error && (
                <p role="alert" className="text-error">
                  {error}
                </p>
              )}
            </CardContent>
          </Card>
          {preview && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{preview.filename}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p>{preview.equationCount} томьёо</p>
                  {preview.warnings.map((w, i) => (
                    <p key={i} className="text-sm text-warning">
                      {w.message}
                    </p>
                  ))}
                </CardContent>
              </Card>
              <section
                aria-label="Баримтын урьдчилсан харагдац"
                className="space-y-3"
              >
                {preview.blocks.map((b) => (
                  <PreviewBlock key={b.id} block={b} />
                ))}
              </section>
              <Card>
                <CardHeader>
                  <CardTitle>Нэг бодлогын бүтцийг баталгаажуулах</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-ink-dim">
                    Мөрийг асуулт болон сонголттой холбоно. Олон мөртэй,
                    зурагтай эсвэл анхааруулгатай бодлогыг эх баримтаас гараар
                    засаж оруулна.
                  </p>
                  <label htmlFor="word-import-chapter" className="block space-y-1">
                    <span>Хадгалах бүлэг сэдэв</span>
                    <select
                      id="word-import-chapter"
                      className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-ink"
                      value={chapterId}
                      onChange={(e) => {
                        setChapterId(e.target.value);
                        setConfirmed(false);
                        setImported(null);
                      }}
                    >
                      <option value="">Бүлэг сэдэв сонгоно уу</option>
                      {chapters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.grade}-р анги —{" "}
                          {c.book?.title ? c.book.title + " — " : ""}
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  {select("Асуултын мөр", mapping.prompt, (prompt) =>
                    setMapping((m) => ({ ...m, prompt })),
                  )}
                  {mapping.choices.map((choice, i) => (
                    <div key={i}>
                      {select(`Сонголт ${i + 1}`, choice, (id) =>
                        setMapping((m) => ({
                          ...m,
                          choices: m.choices.map((c, j) => (j === i ? id : c)),
                          correct: "",
                        })),
                      )}
                    </div>
                  ))}
                  <label htmlFor="word-import-answer" className="block space-y-1">
                    <span>Зөв хариу</span>
                    <select
                      id="word-import-answer"
                      className="min-h-11 w-full rounded-lg border border-line bg-surface px-3"
                      value={mapping.correct}
                      onChange={(e) => {
                        setMapping((m) => ({ ...m, correct: e.target.value }));
                        setConfirmed(false);
                        setImported(null);
                      }}
                    >
                      <option value="">Сонгоно уу</option>
                      {mapping.choices.map(
                        (id, i) =>
                          id && (
                            <option key={i} value={id}>
                              Сонголт {i + 1}
                            </option>
                          ),
                      )}
                    </select>
                  </label>
                  {valid && (
                    <div className="space-y-3 rounded-lg border border-line p-3">
                      <MathText>{chosen(mapping.prompt)!.text}</MathText>
                      {mapping.choices.filter(Boolean).map((id, i) => (
                        <p key={id}>
                          {i + 1}. <MathText>{chosen(id)!.text}</MathText>
                          {id === mapping.correct && " — зөв хариу"}
                        </p>
                      ))}
                    </div>
                  )}
                  <label className="flex min-h-11 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      disabled={!valid}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    <span>
                      Эх баримт, анхааруулга, сонгосон мөрүүд болон зөв хариуг
                      тулгаж шалгасан. Зураг шаардлагатай бодлогыг сонгоогүй.
                    </span>
                  </label>
                  <Button
                    className="h-auto min-h-11 w-full whitespace-normal px-3 py-3 text-center"
                    disabled={
                      !valid || !confirmed || !chapterId || busy || !!imported
                    }
                    onClick={persist}
                  >
                    {busy
                      ? "Хадгалж байна…"
                      : "Баталгаажуулж бодлогын санд хадгалах"}
                  </Button>
                  {imported && (
                    <p role="status" className="text-success">
                      {imported.duplicate
                        ? "Энэ бодлого өмнө нь хадгалагдсан байна."
                        : "Бодлого санд хадгалагдлаа."}{" "}
                      <Link className="underline" href="/app/library">
                        Бодлогын сан нээх
                      </Link>
                    </p>
                  )}
                  <Button
                    variant="outline"
                    disabled={!valid || !confirmed}
                    onClick={download}
                  >
                    Шалгасан ноорог татах
                  </Button>
                  <p className="text-sm text-ink-dim">
                    Ноорог татах товч JSON файл үүсгэнэ. Хадгалах товч сонгосон
                    нэг бодлогыг санд оруулна. Урьдчилсан харагдац 30 минут
                    хүчинтэй.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </main>
  );
}

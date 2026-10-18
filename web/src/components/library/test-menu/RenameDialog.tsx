"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import { MetaTitle } from "@/components/ui/Meta";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import ActionDialog from "./ActionDialog";
import { errorMessage, sortVariants, splitTitle, variantName, type MenuTest } from "./shared";

const MAX_TOPIC = 160;

/**
 * «Нэр өөрчлөх»: сэдвийн нэр («<сэдэв> · Тест N»-ийн « · »-ийн өмнөх хэсэг).
 * Бүлгийн нэр PATCH /chapters/:id, A/B тестийн нэрт хуучин сэдвийн нэр орсон
 * бол ижилхэн солиж PATCH /tests/:id {title, expectedVersion} — хоёр хувилбар
 * нэг нэртэй хэвээр үлдэнэ. Аль нэг алхам бүтэлгүйтвэл дахин дарахад зөвхөн
 * дутуу үлдсэнийг хадгална.
 */
export default function RenameDialog({
  chapterId,
  chapterTitle,
  topicSize,
  onRenamed,
  onClose,
}: {
  chapterId: string;
  chapterTitle: string;
  /** Энэ сэдэвт хэдэн тест (бүлэг) байгаа — 1-ээс их бол тусдаа сэдэв болно */
  topicSize: number;
  onRenamed: (title: string) => void;
  onClose: () => void;
}) {
  const inputId = useId();
  const hintId = useId();
  // Цонх нээгдсэн үеийн нэр — тестийн нэрт орлуулах эх (хэсэгчлэн хадгалагдсан ч өөрчлөгдөхгүй)
  const [original] = useState(() => splitTitle(chapterTitle));
  const [topic, setTopic] = useState(original.topic);
  const [tests, setTests] = useState<MenuTest[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [nonce, setNonce] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Хэсэгчлэн хадгалагдсан бүлгийн нэр — дахин дарахад давтахгүй
  const [savedChapter, setSavedChapter] = useState<string | null>(null);
  // Тестийн АНХНЫ нэр (эхний ачаалалт) — шинэ нэрийг үргэлж үүнээс гаргана. Ингэснээр
  // хэсэгчлэн хадгалсны дараа дахин дарахад давхар орлуулахгүй (ж: «Логарифм» →
  // «Логарифм функц» → «Логарифм функц функц» болохгүй)
  const [originalTitles, setOriginalTitles] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    let alive = true;
    api<MenuTest[]>(`/tests?chapterId=${encodeURIComponent(chapterId)}`)
      .then((rows) => {
        if (!alive) return;
        setTests(sortVariants(rows));
        setOriginalTitles((prev) => prev ?? Object.fromEntries(rows.map((r) => [r.id, r.title])));
        setLoadError("");
      })
      .catch((e) => {
        if (alive) setLoadError(errorMessage(e, "Тестийн мэдээллийг ачаалж чадсангүй"));
      });
    return () => {
      alive = false;
    };
  }, [chapterId, nonce]);

  const next = topic.replace(/\s+/g, " ").trim();
  const validation = !next
    ? "Сэдвийн нэрээ бичнэ үү"
    : next.includes("·")
      ? "Нэрэнд цэг тусгаарлагч бичихгүй — дугаар нь автоматаар үлдэнэ"
      : next.length > MAX_TOPIC
        ? `Нэр ${MAX_TOPIC} тэмдэгтээс богино байна`
        : "";
  const targetChapter = `${next}${original.suffix}`;

  // Тест бүрийн шинэ нэр: хуучин сэдвийн нэр орсон хэсгийг солино, эс бөгөөс хэвээр
  const plan = useMemo(
    () =>
      (tests ?? []).map((t) => {
        const base = originalTitles?.[t.id] ?? t.title;
        const target =
          original.topic && base.includes(original.topic) ? base.split(original.topic).join(next) : base;
        return { test: t, target, changes: target !== t.title };
      }),
    [tests, originalTitles, original.topic, next],
  );
  const chapterChanges = targetChapter !== (savedChapter ?? chapterTitle);
  const dirty = next !== original.topic;
  const nothingToDo = !chapterChanges && plan.every((p) => !p.changes);

  async function save() {
    if (validation || saving || !tests) return;
    setSaving(true);
    setError("");
    try {
      let chapterNow = savedChapter;
      if (chapterChanges) {
        await api(`/chapters/${encodeURIComponent(chapterId)}`, { method: "PATCH", body: { title: targetChapter } });
        chapterNow = targetChapter;
        setSavedChapter(targetChapter);
      }
      for (const [i, p] of plan.entries()) {
        if (!p.changes) continue;
        try {
          await api(`/tests/${encodeURIComponent(p.test.id)}`, {
            method: "PATCH",
            body: { title: p.target, ...(p.test.version !== undefined ? { expectedVersion: p.test.version } : {}) },
          });
        } catch (e) {
          throw new Error(`${variantName(p.test, i)}: ${errorMessage(e)}`);
        }
      }
      toast.success("Нэр өөрчлөгдлөө");
      // Хуудсыг цонх хаагдсаны ДАРАА шинэчилнэ — сэдэв солигдоход энэ карт өөр
      // бүлэг рүү шилжиж цонх дунд нь алга болохоос сэргийлнэ
      onClose();
      if (chapterNow) onRenamed(chapterNow);
    } catch (e) {
      setError(errorMessage(e));
      // Хувилбар (version) шинэчлэгдсэн байж болзошгүй — дараагийн оролдлогод шинээр
      setNonce((n) => n + 1);
    } finally {
      setSaving(false);
    }
  }

  // Хэсэгчлэн хадгалсны дараа хаавал хуудас шинэ нэрийг харуулна
  function finish() {
    onClose();
    if (savedChapter) onRenamed(savedChapter);
  }

  return (
    <ActionDialog
      title="Нэр өөрчлөх"
      description="Сэдвийн нэр — тестийн дугаар хэвээр үлдэнэ"
      dirty={dirty}
      busy={saving}
      onClose={finish}
      footer={
        <>
          <Button type="button" variant="ghost" disabled={saving} onClick={finish}>
            Болих
          </Button>
          <Button
            type="button"
            disabled={!!validation || saving || !tests || nothingToDo}
            onClick={() => void save()}
          >
            {saving ? "Хадгалж байна" : "Хадгалах"}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div>
          <label htmlFor={inputId} className="mb-1 block text-sm font-semibold text-ink">
            Сэдвийн нэр
          </label>
          <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-bg focus-within:border-brand">
            <input
              id={inputId}
              value={topic}
              disabled={saving}
              maxLength={MAX_TOPIC + 20}
              autoComplete="off"
              aria-invalid={!!validation}
              aria-describedby={hintId}
              onChange={(e) => setTopic(e.target.value)}
              className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-base text-ink outline-none"
            />
            {original.suffix && (
              <span className="flex shrink-0 items-center border-l border-line bg-panel px-3 text-sm text-ink-dim">
                <MetaTitle>{original.suffix.replace(/^\s*·\s*/, "")}</MetaTitle>
              </span>
            )}
          </div>
          <p id={hintId} className={`mt-1 text-xs ${validation && dirty ? "text-error" : "text-ink-dim"}`}>
            {validation && dirty ? validation : "Сурагч, багш бүгдэд энэ нэрээр харагдана"}
          </p>
        </div>

        {topicSize > 1 && (
          <p className="flex items-start gap-2 rounded-xl border border-line bg-panel px-3 py-2 text-sm text-ink-dim">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Энэ сэдэвт өөр {topicSize - 1} тест бий. Зөвхөн энэ тестийн нэр өөрчлөгдөж, жагсаалтад тусдаа сэдэв болно
          </p>
        )}

        <section aria-label="Хадгалахад харагдах нэр" className="space-y-2">
          <h3 className="text-sm font-bold text-ink">Хадгалахад</h3>
          {loadError ? (
            <ErrorState message={loadError} onRetry={() => setNonce((n) => n + 1)} />
          ) : !tests ? (
            <LoadingState rows={2} label="Тестийн нэр ачаалж байна" />
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface text-sm">
              <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-3 py-2">
                <span className="text-ink-dim">Сэдэв</span>
                <MetaTitle className="min-w-0 font-semibold text-ink">{targetChapter}</MetaTitle>
              </li>
              {plan.map((p, i) => (
                <li key={p.test.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-3 py-2">
                  <span className="text-ink-dim">{variantName(p.test, i)}</span>
                  <span className="min-w-0 text-right">
                    <MetaTitle className="font-semibold text-ink">{p.target}</MetaTitle>
                    {!p.changes && <span className="block text-xs text-ink-dim">Нэр нь хэвээр үлдэнэ</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {error && <ErrorState message={error} />}
      </form>
    </ActionDialog>
  );
}

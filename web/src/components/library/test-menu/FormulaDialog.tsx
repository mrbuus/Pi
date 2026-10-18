"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, Lock, Plus, Sigma } from "lucide-react";
import { toast } from "sonner";
import AttachmentPreview from "@/components/homework/AttachmentPreview";
import MathText from "@/components/MathText";
import TheoryContent, {
  extractImageAlt,
  insertImageMarkdown,
  removeImageMarkdown,
} from "@/components/theory/TheoryContent";
import { Button } from "@/components/ui/kit/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { api, uploadFile } from "@/lib/api";
import { cn } from "@/lib/cn";
import { confirmDiscardUnsaved } from "@/lib/unsavedChanges";
import ActionDialog from "./ActionDialog";
import {
  applySnippet,
  colorSnippet,
  composeFormulaContent,
  FORMULA_COLORS,
  splitFormulaContent,
  type Snippet,
} from "./formula";
import { errorMessage, FORMULA_TITLE, isFormulaBlock, useChapterTheories, type TheoryRow } from "./shared";

const MAX_CONTENT = 50000;

/** Хэрэгслийн мөр — шошго нь KaTeX-ээр зурагдана (unicode глиф хэрэглэхгүй) */
const TOOLS: { label: string; aria: string; snip: Snippet; plain?: boolean }[] = [
  { label: "$\\frac{a}{b}$", aria: "Бутархай", snip: { before: "\\frac{", after: "}{b}", placeholder: "a" } },
  { label: "$\\sqrt{x}$", aria: "Квадрат язгуур", snip: { before: "\\sqrt{", after: "}", placeholder: "x" } },
  { label: "$\\sqrt[n]{x}$", aria: "n зэргийн язгуур", snip: { before: "\\sqrt[n]{", after: "}", placeholder: "x" } },
  { label: "$x^{n}$", aria: "Зэрэг", snip: { before: "^{", after: "}", placeholder: "2", selectionIsBase: true } },
  { label: "$x_{n}$", aria: "Доод индекс", snip: { before: "_{", after: "}", placeholder: "n", selectionIsBase: true } },
  { label: "$\\le$", aria: "Бага буюу тэнцүү", snip: { before: " \\le ", after: "", selectionIsBase: true } },
  { label: "$\\ge$", aria: "Их буюу тэнцүү", snip: { before: " \\ge ", after: "", selectionIsBase: true } },
  { label: "$\\ne$", aria: "Тэнцүү биш", snip: { before: " \\ne ", after: "", selectionIsBase: true } },
  { label: "$a^{\\circ}$", aria: "Градус", snip: { before: "^{\\circ}", after: "", selectionIsBase: true } },
  { label: "$a \\cdot b$", aria: "Үржих цэг", snip: { before: " \\cdot ", after: "", selectionIsBase: true } },
  { label: "$x$", aria: "Томьёоны хүрээ", snip: { before: "$", after: "$", placeholder: "x", raw: true }, plain: true },
];

const fieldCls =
  "w-full rounded-xl border border-line bg-bg px-3 py-2 font-mono text-sm text-ink outline-none focus:border-brand";

/**
 * «Томьёо»: тестэд хэрэглэгдэх томьёо — бүлгийн 2 дахь TheoryBlock, гарчиг нь
 * ЯГ «Томьёо» (миграцгүй). Агуулга = томьёо + «## Жишээ бодлого» хэсэг.
 * LaTeX хэрэгслийн мөр, өнгө (\textcolor), зураг байршуулах, сурагчид
 * харагдахтай ЯГ ижил урьдчилсан харагдац (TheoryContent/MathText).
 */
export default function FormulaDialog({
  chapterId,
  canEditContent,
  onSaved,
  onClose,
}: {
  chapterId: string;
  canEditContent: boolean;
  onSaved: () => void;
  onClose: () => void;
}) {
  const { rows, error, reload } = useChapterTheories(chapterId);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const block = (rows ?? []).find(isFormulaBlock) ?? null;

  const requestClose = () => {
    if (dirty && !confirmDiscardUnsaved()) return;
    onClose();
  };

  return (
    <ActionDialog
      title="Томьёо"
      description="Тестэд хэрэглэгдэх томьёо ба жишээ бодлого"
      wide
      dirty={dirty}
      busy={busy}
      onClose={onClose}
      footer={
        !canEditContent || error || !rows ? (
          <Button type="button" variant="ghost" onClick={onClose}>
            Хаах
          </Button>
        ) : undefined
      }
    >
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !rows ? (
        <LoadingState rows={6} label="Томьёог ачаалж байна" />
      ) : canEditContent ? (
        <FormulaEditor
          key={block?.id ?? "new"}
          chapterId={chapterId}
          block={block}
          onDirtyChange={setDirty}
          onBusyChange={setBusy}
          onCancel={requestClose}
          onSaved={() => {
            toast.success(block ? "Томьёо хадгалагдлаа" : "Томьёо нэмэгдлээ");
            onSaved();
            onClose();
          }}
        />
      ) : (
        <div className="space-y-3">
          <p className="flex items-start gap-2 text-sm text-ink-dim">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Томьёог Багш+ эсвэл админ засна
          </p>
          {block ? (
            <article className="rounded-xl border border-line bg-panel p-4">
              <h3 className="mb-2 text-base font-bold text-ink">{FORMULA_TITLE}</h3>
              <TheoryContent markdown={block.content} />
            </article>
          ) : (
            <EmptyState
              icon={Sigma}
              title="Томьёо хараахан нэмэгдээгүй"
              hint="Багш+ эсвэл админ энэ тестийн томьёог нэмэхэд энд харагдана"
            />
          )}
        </div>
      )}
    </ActionDialog>
  );
}

type Field = "formulas" | "example";

function FormulaEditor({
  chapterId,
  block,
  onDirtyChange,
  onBusyChange,
  onCancel,
  onSaved,
}: {
  chapterId: string;
  block: TheoryRow | null;
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange: (busy: boolean) => void;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [initial] = useState(() => ({
    ...splitFormulaContent(block?.content ?? ""),
    imageKeys: block?.imageKeys ?? [],
  }));
  const [formulas, setFormulas] = useState(initial.formulas);
  const [example, setExample] = useState(initial.example);
  const [imageKeys, setImageKeys] = useState<string[]>(initial.imageKeys);
  const [active, setActive] = useState<Field>("formulas");
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgAlt, setImgAlt] = useState("");
  const [imgUploading, setImgUploading] = useState(false);
  const [imgError, setImgError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const refs = { formulas: useRef<HTMLTextAreaElement>(null), example: useRef<HTMLTextAreaElement>(null) };
  const createRequest = useRef<{ fingerprint: string; id: string } | null>(null);

  const formulasId = useId();
  const exampleId = useId();
  const altId = useId();

  const content = composeFormulaContent(formulas, example);
  const dirty =
    formulas !== initial.formulas ||
    example !== initial.example ||
    JSON.stringify(imageKeys) !== JSON.stringify(initial.imageKeys) ||
    !!imgFile ||
    !!imgAlt.trim();

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    onBusyChange(saving || imgUploading);
  }, [saving, imgUploading, onBusyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const valueOf = (f: Field) => (f === "formulas" ? formulas : example);
  const setValueOf = (f: Field, v: string) => (f === "formulas" ? setFormulas(v) : setExample(v));

  function insert(snipFor: (selected: string) => Snippet) {
    const el = refs[active].current;
    const value = valueOf(active);
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = applySnippet(value, start, end, snipFor(value.slice(start, end)));
    setValueOf(active, next.value);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(next.selStart, next.selEnd);
    });
  }

  async function addImage() {
    if (imgUploading || saving) return;
    setImgError("");
    if (!imgFile) return setImgError("Зургийн файлаа сонгоно уу");
    if (!imgAlt.trim()) return setImgError("Зургийн товч тайлбар заавал бичнэ үү");
    if (!/\.(jpe?g|png|gif|webp|heic)$/i.test(imgFile.name))
      return setImgError("JPG, PNG, GIF, WEBP эсвэл HEIC зураг сонгоорой");
    if (imgFile.size > 25 * 1024 * 1024) return setImgError("Зураг 25 МБ-аас их байна. Жижигрүүлээд дахин сонгоорой");
    setImgUploading(true);
    try {
      const { key } = await uploadFile(imgFile);
      const field = active;
      setValueOf(field, insertImageMarkdown(valueOf(field), imgAlt.trim(), key).trimEnd());
      setImageKeys((prev) => [...prev, key]);
      setImgAlt("");
      setImgFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setImgError(errorMessage(e, "Зураг байршуулж чадсангүй. Холболтоо шалгаад дахин оролдоно уу"));
    } finally {
      setImgUploading(false);
    }
  }

  function removeImage(key: string) {
    setFormulas((v) => removeImageMarkdown(v, key));
    setExample((v) => removeImageMarkdown(v, key));
    setImageKeys((prev) => prev.filter((k) => k !== key));
  }

  async function save() {
    if (saving || imgUploading || imgFile) return;
    setError("");
    if (!formulas.trim()) return setError("Томьёогоо бичнэ үү");
    if (content.length > MAX_CONTENT) return setError(`Агуулга ${MAX_CONTENT} тэмдэгтээс хэтэрсэн байна`);
    // Агуулгаас хасагдсан зургийн key-г илгээхгүй
    const keys = imageKeys.filter((k) => content.includes(`](${k})`));
    setSaving(true);
    try {
      if (block) {
        await api(`/lessons/theory/${encodeURIComponent(block.id)}`, {
          method: "PATCH",
          body: { title: FORMULA_TITLE, content, imageKeys: keys },
        });
      } else {
        const fingerprint = JSON.stringify([chapterId, content, keys]);
        if (createRequest.current?.fingerprint !== fingerprint)
          createRequest.current = { fingerprint, id: crypto.randomUUID() };
        await api(`/lessons/${encodeURIComponent(chapterId)}/theory`, {
          method: "POST",
          body: { title: FORMULA_TITLE, content, imageKeys: keys, clientRequestId: createRequest.current.id },
        });
      }
      onDirtyChange(false);
      onSaved();
    } catch (e) {
      setError(errorMessage(e, "Хадгалж чадсангүй. Бичсэн зүйл хэвээр байна — дахин оролдоно уу"));
    } finally {
      setSaving(false);
    }
  }

  const textarea = (field: Field, id: string, label: string, rows: number, placeholder: string) => (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-ink">
        {label}
      </label>
      <textarea
        id={id}
        ref={refs[field]}
        rows={rows}
        value={valueOf(field)}
        disabled={saving}
        placeholder={placeholder}
        onFocus={() => setActive(field)}
        onChange={(e) => setValueOf(field, e.target.value)}
        className={cn(fieldCls, active === field && "border-brand-bright/60")}
        style={{ whiteSpace: "pre-wrap" }}
      />
    </div>
  );

  const preview = (
    <div className="rounded-xl border border-line bg-panel p-4">
      {content.trim() ? (
        <>
          <h3 className="mb-2 text-base font-bold text-ink">{FORMULA_TITLE}</h3>
          <TheoryContent markdown={content} />
        </>
      ) : (
        <p className="text-sm text-ink-dim">Томьёо бичихэд энд сурагчид харагдах байдлаар гарна</p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Утас/таблет: засах ба урьдчилан харах ээлжилнэ; том дэлгэцэнд зэрэгцэнэ */}
      <div className="flex gap-2 lg:hidden" role="group" aria-label="Харагдац">
        {(["edit", "preview"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-brand",
              view === v ? "border-transparent bg-brand-bright text-on-brand" : "border-line bg-surface text-ink-dim hover:text-ink",
            )}
          >
            {v === "edit" ? "Засах" : "Сурагчид харагдах нь"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cn("min-w-0 space-y-3", view !== "edit" && "hidden lg:block")}>
          {/* LaTeX хэрэгсэл */}
          <div className="space-y-2 rounded-xl border border-line bg-surface p-2">
            <div className="flex flex-wrap gap-1" role="toolbar" aria-label="Томьёо оруулах хэрэгсэл">
              {TOOLS.map((t) => (
                <button
                  key={t.aria}
                  type="button"
                  title={t.aria}
                  aria-label={t.aria}
                  disabled={saving}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insert(() => t.snip)}
                  className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg px-2 text-sm text-ink transition hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50"
                >
                  <span aria-hidden className={cn("pointer-events-none", t.plain && "font-mono text-ink-dim")}>
                    {t.plain ? t.label : <MathText>{t.label}</MathText>}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1 border-t border-line pt-2" role="toolbar" aria-label="Өнгө">
              <span className="px-1 text-xs font-semibold text-ink-dim">Өнгө</span>
              {FORMULA_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.name}
                  aria-label={`${c.name} өнгө`}
                  disabled={saving}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insert((selected) => colorSnippet(c.hex, selected))}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg transition hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50"
                >
                  <span aria-hidden className="h-5 w-5 rounded-full border border-line" style={{ background: c.hex }} />
                </button>
              ))}
            </div>
            <p className="px-1 text-xs text-ink-dim">
              Сонгосон хэсэгт үйлчилнэ. Томьёоны гадна дарвал <code className="font-mono">$</code> хүрээг өөрөө нэмнэ
            </p>
          </div>

          {textarea(
            "formulas",
            formulasId,
            "Томьёо",
            8,
            "Жишээ:\n- Квадратын талбай: $S = a^{2}$\n- Диагональ: $d = a\\sqrt{2}$",
          )}
          {textarea(
            "example",
            exampleId,
            "Жишээ бодлого (заавал биш)",
            6,
            "Бодлогын нөхцөл, бодолтыг алхам алхмаар бичнэ",
          )}

          {/* Зураг нэмэх — идэвхтэй талбарын төгсгөлд орно */}
          <div className="rounded-xl border border-line bg-bg p-3">
            <p className="mb-2 text-sm font-semibold text-ink">
              Зураг нэмэх{" "}
              <span className="font-normal text-ink-dim">
                — {active === "formulas" ? "томьёоны" : "жишээ бодлогын"} хэсэгт орно
              </span>
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/heic,.heic"
                aria-label="Зураг сонгох"
                disabled={imgUploading || saving}
                onChange={(e) => setImgFile(e.target.files?.[0] ?? null)}
                className="min-h-11 w-full min-w-0 text-sm text-ink-dim sm:w-auto"
              />
              <label htmlFor={altId} className="sr-only">
                Зургийн тайлбар
              </label>
              <input
                id={altId}
                value={imgAlt}
                disabled={imgUploading || saving}
                placeholder="Зургийн товч тайлбар (заавал)"
                onChange={(e) => setImgAlt(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink outline-none focus:border-brand sm:max-w-xs"
              />
              <Button type="button" variant="outline" size="sm" disabled={imgUploading || saving} onClick={() => void addImage()} className="min-h-11">
                <Plus aria-hidden />
                {imgUploading ? "Байршуулж байна" : "Нэмэх"}
              </Button>
            </div>
            {imgError && (
              <p role="alert" className="mt-2 flex gap-2 text-sm text-error">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {imgError}
              </p>
            )}
            {imageKeys.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-3">
                {imageKeys.map((key) => {
                  const alt = extractImageAlt(formulas, key) || extractImageAlt(example, key);
                  return (
                    <li key={key} className="flex w-28 flex-col items-center gap-1 rounded-xl border border-line bg-surface p-1.5">
                      <AttachmentPreview fileKey={key} label={alt || "Томьёоны зураг"} />
                      <span className="line-clamp-1 w-full text-center text-[11px] text-ink-dim">{alt || "Тайлбаргүй"}</span>
                      <button
                        type="button"
                        disabled={imgUploading || saving}
                        onClick={() => removeImage(key)}
                        className="min-h-11 text-xs font-semibold text-error hover:underline"
                      >
                        Хасах
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className={cn("min-w-0 space-y-1", view !== "preview" && "hidden lg:block")}>
          <p className="text-sm font-semibold text-ink">Сурагчид ингэж харагдана</p>
          <div className="lg:sticky lg:top-0">{preview}</div>
        </div>
      </div>

      {error && <ErrorState message={error} />}
      {imgFile && (
        <p className="text-sm text-ink-dim">Сонгосон зургаа эхлээд «Нэмэх» товчоор байршуулна</p>
      )}

      {/* Утсан дээр урт засварын доод хэсэгт ч хадгалах товч харагдана */}
      <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-wrap justify-end gap-2 border-t border-line bg-surface px-4 py-3 sm:-mx-5 sm:px-5">
        <Button type="button" variant="ghost" disabled={saving || imgUploading} onClick={onCancel}>
          Болих
        </Button>
        <Button type="button" disabled={saving || imgUploading || !!imgFile || !dirty} onClick={() => void save()}>
          {saving ? "Хадгалж байна" : block ? "Хадгалах" : "Нэмэх"}
        </Button>
      </div>
    </div>
  );
}

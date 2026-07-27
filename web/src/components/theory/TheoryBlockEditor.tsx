"use client";

import { useEffect, useId, useRef, useState } from "react";
import { api, fileUrl, uploadFile } from "@/lib/api";
import MarkdownCheatsheet from "./MarkdownCheatsheet";
import TheoryContent, {
  extractImageAlt,
  insertImageMarkdown,
  removeImageMarkdown,
} from "./TheoryContent";
import type { TheoryBlock } from "./types";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

const inputCls =
  "w-full rounded-lg border border-line bg-bg px-3 py-2 text-base text-ink outline-none focus:border-brand";

/**
 * Нэг онолын блокийг үүсгэх/засах форм — markdown бичих талбар БОЛОН
 * түүний LIVE PREVIEW-г хажуу хажуугаар нь харуулна (TheoryContent-ээр,
 * сурагчид харагдах яг тэр рендерлэлт).
 *
 * `key={block?.id ?? "new"}`-ээр parent-аас remount хийгдэнэ (TheoryEditorClient
 * дотор) — блок сэлгэхэд local draft өөрөө цэвэрлэгдэнэ.
 */
export default function TheoryBlockEditor({
  chapterId,
  block,
  onSaved,
  onCancel,
  onDirtyChange,
}: {
  chapterId: string;
  block: TheoryBlock | null;
  onSaved: () => void;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const isEdit = !!block;
  const initialTitle = block?.title ?? "";
  const initialContent = block?.content ?? "";
  const initialImageKeys = block?.imageKeys ?? [];

  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [imageKeys, setImageKeys] = useState<string[]>(initialImageKeys);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [imgAlt, setImgAlt] = useState("");
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgUploading, setImgUploading] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const titleId = useId();
  const contentId = useId();
  const altId = useId();

  const dirty =
    title !== initialTitle ||
    content !== initialContent ||
    JSON.stringify(imageKeys) !== JSON.stringify(initialImageKeys);

  useEffect(() => {
    onDirtyChange(dirty);
    // Компонент unmount (өөр блок сонгох/цонх хаах) үед dirty-г цэвэрлэнэ
    return () => onDirtyChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  async function handleAddImage() {
    setImgError(null);
    if (!imgFile) {
      setImgError("Зургийн файлаа сонгоно уу");
      return;
    }
    if (!imgAlt.trim()) {
      setImgError("Зургийн тухай богино тайлбар (alt) заавал бичнэ үү — дэлгэцийн уншигчид болон интернэт удаан ачаалахад хэрэглэгдэнэ");
      return;
    }
    setImgUploading(true);
    try {
      const { key } = await uploadFile(imgFile);
      setContent((c) => insertImageMarkdown(c, imgAlt.trim(), key));
      setImageKeys((prev) => [...prev, key]);
      setImgAlt("");
      setImgFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      setImgError(errMsg(e));
    } finally {
      setImgUploading(false);
    }
  }

  function handleRemoveImage(key: string) {
    setContent((c) => removeImageMarkdown(c, key));
    setImageKeys((prev) => prev.filter((k) => k !== key));
  }

  async function handleSave() {
    setError(null);
    if (!title.trim()) {
      setError("Гарчиг оруулна уу");
      return;
    }
    if (!content.trim()) {
      setError("Онолын агуулга хоосон байна");
      return;
    }
    setSaving(true);
    try {
      if (isEdit && block) {
        await api(`/lessons/theory/${block.id}`, {
          method: "PATCH",
          body: { title: title.trim(), content, imageKeys },
        });
      } else {
        await api(`/lessons/${chapterId}/theory`, {
          method: "POST",
          body: { title: title.trim(), content, imageKeys },
        });
      }
      onDirtyChange(false);
      onSaved();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-brand-soft">
          {isEdit ? "Онолын блок засах" : "Шинэ онолын блок"}
        </h3>
        {dirty && (
          <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
            Хадгалаагүй өөрчлөлт байна
          </span>
        )}
      </div>

      <div>
        <label htmlFor={titleId} className="mb-1 block text-sm font-semibold text-ink">
          Гарчиг
        </label>
        <input
          id={titleId}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Жишээ: Квадрат тэгшитгэл ба ялгаварлагч"
          className={inputCls}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label htmlFor={contentId} className="block text-sm font-semibold text-ink">
              Онолын агуулга (markdown)
            </label>
          </div>
          <textarea
            id={contentId}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            placeholder={
              "## Гарчиг\n\nЭнд онолын тайлбараа бичнэ. Жишээ томьёо: $x^2 + y^2 = z^2$"
            }
            className={`${inputCls} font-mono text-sm`}
            style={{ whiteSpace: "pre-wrap" }}
          />
          <div className="mt-2">
            <MarkdownCheatsheet />
          </div>

          {/* Зураг нэмэх */}
          <div className="mt-3 rounded-lg border border-line bg-bg p-3">
            <p className="mb-2 text-sm font-semibold text-ink">Зураг нэмэх</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setImgFile(e.target.files?.[0] ?? null)}
                className="text-sm text-ink-dim"
              />
              <label htmlFor={altId} className="sr-only">
                Зургийн тайлбар
              </label>
              <input
                id={altId}
                value={imgAlt}
                onChange={(e) => setImgAlt(e.target.value)}
                placeholder="Зургийн товч тайлбар (заавал)"
                className={`sm:max-w-xs ${inputCls}`}
              />
              <button
                type="button"
                onClick={handleAddImage}
                disabled={imgUploading}
                className="shrink-0 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:border-brand disabled:opacity-50"
              >
                {imgUploading ? "Байршуулж байна…" : "+ Нэмэх"}
              </button>
            </div>
            {imgError && <p className="mt-2 text-sm text-error">⚠ {imgError}</p>}

            {imageKeys.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-3">
                {imageKeys.map((key) => (
                  <li
                    key={key}
                    className="flex w-28 flex-col items-center gap-1 rounded-lg border border-line bg-surface p-1.5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fileUrl(key)}
                      alt={extractImageAlt(content, key) || "Онолын зураг"}
                      className="h-16 w-full rounded-md object-cover"
                    />
                    <span className="line-clamp-1 w-full text-center text-[11px] text-ink-dim">
                      {extractImageAlt(content, key) || "(тайлбаргүй)"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(key)}
                      className="text-[11px] font-semibold text-error hover:underline"
                    >
                      Хасах
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Live preview */}
        <div>
          <p className="mb-1 text-sm font-semibold text-ink">
            Сурагчид ингэж харагдана (урьдчилан харах)
          </p>
          <div className="min-h-[16rem] rounded-lg border border-line bg-panel p-4">
            {content.trim() ? (
              <TheoryContent markdown={content} />
            ) : (
              <p className="text-sm text-ink-dim">
                Агуулга бичихэд эндээс шууд харагдана…
              </p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-error">
          ⚠ {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold text-on-brand transition disabled:opacity-50"
        >
          {saving ? "Хадгалж байна…" : isEdit ? "Хадгалах" : "Үүсгэх"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-brand"
        >
          Болих
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import { Camera, CircleCheck, LoaderCircle, RefreshCw, Trash2, TriangleAlert, Undo2 } from "lucide-react";
import PhotoPicker from "@/components/makeup/PhotoPicker";
import { Button } from "@/components/ui/kit/button";
import { Meta } from "@/components/ui/Meta";
import type { UploadPurpose } from "@/lib/api";
import { formatMnDateTime } from "@/lib/dateMn";
import PhotoPages from "./PhotoPages";

export interface SentSet {
  keys: string[];
  pages: number;
  at: string | null;
}

export function sentTime(at: string | null) {
  return at ? formatMnDateTime(at, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : null;
}

/**
 * Миний зургийн багц: илгээсэн бол жижиг зураг + «Дахин илгээх» / «Устгах»,
 * үгүй бол «Зураг авах» / «Зургаас сонгох» (PhotoPicker → утсан дээр нэг файл
 * болгож шахна → S3 руу шууд → onSave). Онол ба гэрийн даалгавар хоёулаа ашиглана.
 */
export default function PhotoSetSender({
  sent,
  canEdit,
  onSave,
  onDelete,
  purpose,
  maxPages,
  fileName,
  crop = false,
  viewerTitle,
  viewerSubtitle,
  autoLoad = false,
  collapsed = false,
  sendLabel = "Зураг илгээх",
  heading,
  flash = false,
}: {
  sent: SentSet | null;
  canEdit: boolean;
  onSave: (keys: string[], pages: number) => Promise<void>;
  onDelete?: () => Promise<void>;
  purpose: UploadPurpose;
  maxPages: number;
  fileName: string;
  crop?: boolean;
  viewerTitle: string;
  viewerSubtitle?: string;
  autoLoad?: boolean;
  /** Илгээгээгүй үед эхлээд ганц товч — дарахад сонгох хэсэг нээгдэнэ */
  collapsed?: boolean;
  sendLabel?: string;
  /** Илгээсэн картын гарчгийн мөрөнд (ж: «Таны зураг», «Томилогдсон») */
  heading?: ReactNode;
  /** Шинээр үүссэн үед «Илгээгдлээ» мэдэгдлийг шууд харуулах */
  flash?: boolean;
}) {
  const [replacing, setReplacing] = useState(false);
  const [expanded, setExpanded] = useState(!collapsed);
  const [justSent, setJustSent] = useState(flash);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function save(keys: string[], pages: number) {
    await onSave(keys, pages);
    setReplacing(false);
    setJustSent(true);
  }

  async function remove() {
    if (!onDelete) return;
    setDeleting(true);
    setError("");
    try {
      await onDelete();
      setConfirmDelete(false);
      setJustSent(false);
      setExpanded(true);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Устгаж чадсангүй. Дахин оролдоно уу");
    } finally {
      setDeleting(false);
    }
  }

  if (sent && !replacing) {
    const time = sentTime(sent.at);
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {heading ?? (
            <span className="inline-flex items-center gap-1.5 font-bold text-success">
              <CircleCheck className="size-5 shrink-0" aria-hidden />
              Илгээсэн
            </span>
          )}
          <Meta
            className="text-sm tabular-nums text-ink-dim"
            items={[time, `${sent.pages} хуудас`]}
          />
        </div>
        <PhotoPages keys={sent.keys} pages={sent.pages} title={viewerTitle} subtitle={viewerSubtitle} autoLoad={autoLoad} />
        {justSent && (
          <p role="status" className="flex items-center gap-1.5 text-sm font-semibold text-success">
            <CircleCheck className="size-4 shrink-0" aria-hidden />
            Илгээгдлээ
          </p>
        )}
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            {!confirmDelete ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11"
                  onClick={() => {
                    setReplacing(true);
                    setJustSent(false);
                    setError("");
                  }}
                >
                  <RefreshCw aria-hidden />
                  Дахин илгээх
                </Button>
                {onDelete && (
                  <Button variant="ghost" size="sm" className="min-h-11" onClick={() => setConfirmDelete(true)}>
                    <Trash2 aria-hidden />
                    Устгах
                  </Button>
                )}
              </>
            ) : (
              <>
                <span className="text-sm text-ink">Устгах уу?</span>
                <Button variant="danger" size="sm" className="min-h-11" disabled={deleting} onClick={() => void remove()}>
                  {deleting ? (
                    <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />
                  ) : (
                    <Trash2 aria-hidden />
                  )}
                  Тийм
                </Button>
                <Button variant="ghost" size="sm" className="min-h-11" disabled={deleting} onClick={() => setConfirmDelete(false)}>
                  Үгүй
                </Button>
              </>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="flex items-center gap-1.5 text-sm text-error">
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}
      </div>
    );
  }

  if (!canEdit) return null;

  if (!expanded && !replacing) {
    return (
      <Button size="lg" className="w-full" onClick={() => setExpanded(true)}>
        <Camera aria-hidden />
        {sendLabel}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <PhotoPicker
        current={[]}
        pages={0}
        onSave={save}
        purpose={purpose}
        maxPages={maxPages}
        crop={crop}
        fileName={fileName}
        addLabel="Хуудас нэмэх"
      />
      {replacing && (
        <Button variant="ghost" size="sm" className="min-h-11" onClick={() => setReplacing(false)}>
          <Undo2 aria-hidden />
          Хуучнаараа үлдээх
        </Button>
      )}
    </div>
  );
}

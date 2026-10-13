"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useState } from "react";
import { Copy, Download, FileSpreadsheet, History, MoreHorizontal, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import { MetaTitle } from "@/components/ui/Meta";
import ExamDialog from "./ExamDialog";
import TestHistoryDialog from "@/components/history/TestHistoryDialog";
import { downloadBase64, errorText } from "./types";

interface YoutubeImportResult {
  applied: boolean;
  updated: number;
  unchanged: number;
  errors: { row: number; message: string }[];
}

const itemClass =
  "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink outline-none data-[highlighted]:bg-ink/5";

/** «⋯» цэс: Өөрчлөлтийн түүх · Хуулах · YouTube Excel (1000 бодлого) · Устгах (Багш+/Админ). */
export default function MoreMenu({
  testId,
  title,
  canDuplicate,
  canDelete,
  youtube,
  history = true,
  onChanged,
}: {
  testId: string;
  title: string;
  canDuplicate: boolean;
  canDelete: boolean;
  youtube: boolean;
  /** «Өөрчлөлтийн түүх» — эрхийг сервер шалгана (Багш — өөрийн үүсгэсэн/зассан) */
  history?: boolean;
  onChanged: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [ytOpen, setYtOpen] = useState(false);
  const [ytFile, setYtFile] = useState<File | null>(null);
  const [ytResult, setYtResult] = useState<YoutubeImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function duplicate() {
    try {
      await api(`/tests/${encodeURIComponent(testId)}/duplicate`, { method: "POST" });
      toast.success("Хуулбар ноорог болж үүслээ");
      onChanged();
    } catch (e) {
      toast.error(errorText(e, "Хуулж чадсангүй"));
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api(`/tests/${encodeURIComponent(testId)}`, { method: "DELETE" });
      toast.success("Шалгалт устгагдлаа");
      setConfirmDelete(false);
      onChanged();
    } catch (e) {
      toast.error(errorText(e, "Устгаж чадсангүй"));
    } finally {
      setBusy(false);
    }
  }

  async function ytDownload() {
    try {
      downloadBase64(await api<{ filename: string; mime: string; base64: string }>("/thousand/youtube/export"));
    } catch (e) {
      toast.error(errorText(e, "Татаж чадсангүй"));
    }
  }

  async function ytUpload() {
    if (!ytFile) return;
    setBusy(true);
    setYtResult(null);
    try {
      const form = new FormData();
      form.append("file", ytFile);
      setYtResult(await api<YoutubeImportResult>("/thousand/youtube/import", { method: "POST", body: form }));
    } catch (e) {
      toast.error(errorText(e, "Оруулж чадсангүй"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="Нэмэлт үйлдэл"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-ink-dim hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={4} className="elev-2 z-[65] w-64 rounded-xl border border-line bg-surface p-1">
            {history && (
              <DropdownMenu.Item className={itemClass} onSelect={() => setHistoryOpen(true)}>
                <History className="h-4 w-4 text-ink-dim" aria-hidden /> Өөрчлөлтийн түүх
              </DropdownMenu.Item>
            )}
            {canDuplicate && (
              <DropdownMenu.Item className={itemClass} onSelect={() => void duplicate()}>
                <Copy className="h-4 w-4 text-ink-dim" aria-hidden /> Хуулах
              </DropdownMenu.Item>
            )}
            {youtube && (
              <DropdownMenu.Item className={itemClass} onSelect={() => setYtOpen(true)}>
                <FileSpreadsheet className="h-4 w-4 text-ink-dim" aria-hidden /> YouTube холбоос (Excel)
              </DropdownMenu.Item>
            )}
            {canDelete && (
              <DropdownMenu.Item className={`${itemClass} text-error`} onSelect={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" aria-hidden /> Устгах
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <TestHistoryDialog
        testId={testId}
        title={title}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onRestored={onChanged}
      />

      <ExamDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Шалгалтыг устгах уу?"
        description={<MetaTitle>{title}</MetaTitle>}
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setConfirmDelete(false)}>
              Болих
            </Button>
            <Button variant="danger" type="button" disabled={busy} onClick={() => void remove()}>
              <Trash2 aria-hidden /> Устгах
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">Жагсаалтаас хасагдана. Сурагчдын өгсөн дүн, түүх хадгалагдана.</p>
      </ExamDialog>

      <ExamDialog
        open={ytOpen}
        onOpenChange={(o) => {
          setYtOpen(o);
          if (!o) {
            setYtFile(null);
            setYtResult(null);
          }
        }}
        title="YouTube холбоос (Excel)"
        description="Тест, бодлогын дугаар, холбоос — бүх 1000 бодлогын тестэд"
      >
        <div className="space-y-4">
          <Button type="button" variant="outline" onClick={() => void ytDownload()}>
            <Download aria-hidden /> Загвар татах
          </Button>
          <div className="space-y-2">
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => {
                setYtFile(e.target.files?.[0] ?? null);
                setYtResult(null);
              }}
              className="block w-full text-sm text-ink file:mr-3 file:min-h-11 file:rounded-xl file:border file:border-line file:bg-panel file:px-3 file:font-semibold file:text-ink"
            />
            <Button type="button" disabled={!ytFile || busy} onClick={() => void ytUpload()}>
              <Upload aria-hidden /> {busy ? "Шалгаж байна" : "Оруулах"}
            </Button>
          </div>
          {ytResult &&
            (ytResult.applied ? (
              <p role="status" className="rounded-xl border border-success/30 bg-success/10 p-3 text-sm font-semibold text-success">
                {ytResult.updated} холбоос шинэчлэгдлээ, {ytResult.unchanged} өөрчлөлтгүй.
              </p>
            ) : (
              <div role="alert" className="space-y-2 rounded-xl border border-error/30 bg-error/5 p-3 text-sm text-error">
                <p className="font-semibold">Алдаатай мөр байгаа тул юу ч хадгалсангүй.</p>
                <ul className="space-y-1">
                  {ytResult.errors.slice(0, 50).map((e) => (
                    <li key={e.row}>
                      {e.row}-р мөр: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </ExamDialog>
    </>
  );
}

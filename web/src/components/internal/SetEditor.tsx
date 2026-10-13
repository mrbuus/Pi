"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  ClipboardPaste,
  FilePlus2,
  FileText,
  History,
  ListChecks,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Send,
  Settings2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/kit/drawer";
import { Meta } from "@/components/ui/Meta";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { api, getRole } from "@/lib/api";
import { cn } from "@/lib/cn";
import { relativeTimeMn } from "@/lib/relativeTimeMn";
import BlockCard, { type BlockAction } from "./BlockCard";
import Dialog from "./Dialog";
import { draftApi } from "./draftApi";
import GuidePanel from "./GuidePanel";
import ImportReview, { toBlockInput } from "./ImportReview";
import { SUBJECT_LABEL } from "./model";
import { parseDraftText, wordBlocksToText, type ParsedBlock, type WordPreviewBlock } from "./parse";
import PublishDialog from "./PublishDialog";
import { HistoryDialog, NoAccess, SettingsDialog } from "./SetDialogs";
import { useDraftEditor, type SaveState } from "./useDraftEditor";

const noop = () => () => {};
const menuItem =
  "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl px-3 text-sm font-semibold text-ink outline-none data-[highlighted]:bg-ink/5";

function SaveStatus({ status, at }: { status: SaveState; at: Date | null }) {
  const view = {
    saved: { icon: <Check className="size-4" aria-hidden />, text: "Хадгалсан", tone: "text-ink-dim" },
    dirty: { icon: <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />, text: "Хадгалж байна", tone: "text-ink-dim" },
    saving: { icon: <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />, text: "Хадгалж байна", tone: "text-ink-dim" },
    error: { icon: <CircleAlert className="size-4" aria-hidden />, text: "Хадгалагдаагүй", tone: "text-error" },
    conflict: { icon: <CircleAlert className="size-4" aria-hidden />, text: "Зөрчилтэй", tone: "text-error" },
  }[status];
  return (
    <span
      aria-live="polite"
      title={status === "saved" && at ? `Сүүлд ${relativeTimeMn(at)}` : undefined}
      className={cn("inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold", view.tone)}
    >
      {view.icon}
      {view.text}
    </span>
  );
}

export default function SetEditor({ id }: { id: string }) {
  const role = useSyncExternalStore(noop, getRole, () => null);
  if (role === null) return null;
  if (role !== "ADMIN" && role !== "TEACHER_PLUS") return <NoAccess />;
  return <Editor id={id} />;
}

function Editor({ id }: { id: string }) {
  const router = useRouter();
  const ed = useDraftEditor(id);
  const { meta, rows, edit, save, duplicate, remove, move, resolveConflict, addBlock, addMany, flushAll, updateMeta, setMeta, reload } = ed;
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [focusId, setFocusId] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [wordBlocks, setWordBlocks] = useState<ParsedBlock[] | null>(null);
  const [wordBusy, setWordBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const wordInput = useRef<HTMLInputElement>(null);

  const openBlock = useCallback((blockId: string, focus = false) => {
    setOpenIds((prev) => new Set(prev).add(blockId));
    if (focus) setFocusId(blockId);
    requestAnimationFrame(() =>
      document.getElementById(`block-${blockId}`)?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }, []);

  const toggle = useCallback(
    (blockId: string) => {
      setOpenIds((prev) => {
        const next = new Set(prev);
        if (next.has(blockId)) {
          next.delete(blockId);
          void save(blockId);
        } else next.add(blockId);
        return next;
      });
      setFocusId(null);
    },
    [save],
  );

  const onAction = useCallback(
    (blockId: string, action: BlockAction) => {
      const fail = (e: unknown) => toast.error(e instanceof Error ? e.message : "Амжсангүй");
      if (action === "duplicate") duplicate(blockId).then((copy) => openBlock(copy.id)).catch(fail);
      else if (action === "up") move(blockId, -1);
      else if (action === "down") move(blockId, 1);
      else if (action === "delete") remove(blockId).catch(fail);
      else if (action === "retry") void save(blockId);
      else resolveConflict(blockId, action);
    },
    [duplicate, move, openBlock, remove, resolveConflict, save],
  );

  async function addBlank(afterId?: string) {
    setAdding(true);
    try {
      const block = await addBlock(afterId);
      openBlock(block.id, true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Бодлого нэмж чадсангүй");
    } finally {
      setAdding(false);
    }
  }

  async function addParsed(blocks: ParsedBlock[], source: "PASTE" | "WORD") {
    try {
      const created = await addMany(blocks.map(toBlockInput), source);
      toast.success(`${created.length} бодлого нэмэгдлээ`);
      setGuideOpen(false);
      if (created[0])
        requestAnimationFrame(() =>
          document.getElementById(`block-${created[0].id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }),
        );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Нэмж чадсангүй");
      throw e;
    }
  }

  async function readWord(file: File | undefined) {
    if (!file) return;
    if (!/\.docx$/i.test(file.name) || file.size > 10 * 1024 * 1024) {
      toast.error("10 МБ-аас ихгүй .docx файл сонгоно уу");
      return;
    }
    setWordBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      // Word-ын задлагчийг дахин ашиглана (api/src/document-import) — OMML томьёо → LaTeX
      const preview = await api<{ blocks: WordPreviewBlock[] }>("/document-import/preview", { method: "POST", body: form });
      const blocks = parseDraftText(wordBlocksToText(preview.blocks));
      if (!blocks.length) toast.error("Файлаас бодлого танигдсангүй");
      else setWordBlocks(blocks);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Файлыг уншиж чадсангүй");
    } finally {
      setWordBusy(false);
    }
  }

  function showPaste() {
    const box = document.getElementById("guide-paste");
    if (box && box.offsetParent !== null && window.matchMedia("(min-width: 1024px)").matches) {
      box.scrollIntoView({ behavior: "smooth", block: "center" });
      box.focus();
    } else setGuideOpen(true);
  }

  async function openSolve() {
    await flushAll();
    router.push(`/app/internal/${id}/solve`);
  }

  async function deleteSet() {
    try {
      await draftApi.deleteSet(id);
      toast.success("Ноорогийг устгалаа");
      router.push("/app/internal");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Устгаж чадсангүй");
    }
  }

  if (ed.loadError)
    return (
      <div className="mx-auto max-w-xl space-y-4 py-8">
        <ErrorState message={ed.loadError} onRetry={() => void reload()} />
        <Link href="/app/internal" className="inline-flex min-h-11 items-center text-brand underline">
          Бүх ноорог
        </Link>
      </div>
    );
  if (!meta) return <EditorSkeleton />;

  const addMenu = (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline" disabled={adding || wordBusy} aria-label="Бодлого нэмэх сонголт" className="max-sm:size-12 max-sm:px-0">
          {adding || wordBusy ? <LoaderCircle className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
          <span className="max-sm:sr-only">Бодлого</span>
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={6} className="z-50 min-w-60 rounded-2xl border border-line bg-surface p-1.5 shadow-lg enter-pop">
          <DropdownMenu.Item className={menuItem} onSelect={() => void addBlank(rows.at(-1)?.id)}>
            <FilePlus2 className="size-4 text-ink-dim" aria-hidden /> Шинэ бодлого
          </DropdownMenu.Item>
          <DropdownMenu.Item className={menuItem} onSelect={showPaste}>
            <ClipboardPaste className="size-4 text-ink-dim" aria-hidden /> ChatGPT-ээс буулгах
          </DropdownMenu.Item>
          <DropdownMenu.Item className={menuItem} onSelect={() => wordInput.current?.click()}>
            <FileText className="size-4 text-ink-dim" aria-hidden /> Word файлаас
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );

  return (
    <div className="pb-10">
      <input
        ref={wordInput}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void readWord(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <Link href="/app/internal" className="-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-1 text-sm font-semibold text-ink-dim transition hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Бүх ноорог
      </Link>

      <div className="mt-1 flex flex-wrap items-start gap-x-3 gap-y-1">
        <label htmlFor="draft-title" className="sr-only">
          Ноорогийн нэр
        </label>
        <TitleInput value={meta.title} onChange={(title, delay) => updateMeta({ title }, delay)} />
        <span className="hidden sm:inline-flex">
          <SaveStatus status={ed.status} at={ed.lastSavedAt} />
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-dim">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="inline-flex min-h-9 max-w-full items-center rounded-2xl border border-line bg-surface px-3 py-1 text-left transition hover:border-brand-bright/40 hover:text-ink"
        >
          <Meta
            className="min-w-0"
            items={[
              SUBJECT_LABEL[meta.subject],
              meta.chapter ? <span className="truncate">{meta.chapter.title.replace(/\s+·\s+/g, " — ")}</span> : "Бүлэг сонгоогүй",
              meta.topic,
            ]}
          />
        </button>
        <Badge tone={meta.status === "PUBLISHED" ? "success" : "brand"}>{meta.status === "PUBLISHED" ? "Нийтэлсэн" : "Ноорог"}</Badge>
        <span>{rows.length} бодлого</span>
        <span className="sm:hidden">
          <SaveStatus status={ed.status} at={ed.lastSavedAt} />
        </span>
      </div>

      <div className="sticky top-14 z-20 -mx-4 mt-4 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          {addMenu}
          <Button variant="secondary" className="max-sm:px-3.5" onClick={() => void openSolve()} disabled={!rows.length}>
            <ListChecks aria-hidden /> Бодох
          </Button>
          <span className="flex-1" />
          <Button className="max-sm:px-3.5" onClick={() => setPublishOpen(true)} disabled={!rows.length}>
            <Send aria-hidden /> Нийтлэх
          </Button>
          <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger
              aria-label="Бусад үйлдэл"
              className="inline-flex size-11 items-center justify-center rounded-2xl text-ink-dim transition hover:bg-ink/5 hover:text-ink data-[state=open]:bg-ink/5"
            >
              <MoreHorizontal className="size-5" aria-hidden />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-52 rounded-2xl border border-line bg-surface p-1.5 shadow-lg enter-pop">
                <DropdownMenu.Item className={menuItem} onSelect={() => setSettingsOpen(true)}>
                  <Settings2 className="size-4 text-ink-dim" aria-hidden /> Тохиргоо
                </DropdownMenu.Item>
                <DropdownMenu.Item className={menuItem} onSelect={() => setHistoryOpen(true)}>
                  <History className="size-4 text-ink-dim" aria-hidden /> Түүх
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-line" />
                <DropdownMenu.Item className={cn(menuItem, "text-error")} onSelect={() => setDeleteOpen(true)}>
                  <Trash2 className="size-4" aria-hidden /> Ноорогийг устгах
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      <div className="mt-5 gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
        <section aria-label="Бодлогууд" className="min-w-0 space-y-4">
          {rows.length === 0 ? (
            <EmptyState
              icon={FilePlus2}
              title="Бодлого алга"
              hint="Шинээр бичих, ChatGPT-ийн хариуг буулгах эсвэл Word файл оруулна"
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={() => void addBlank()} disabled={adding}>
                    <Plus aria-hidden /> Шинэ бодлого
                  </Button>
                  <Button variant="outline" className="lg:hidden" onClick={() => setGuideOpen(true)}>
                    <ClipboardPaste aria-hidden /> ChatGPT-ээс
                  </Button>
                  <Button variant="outline" onClick={() => wordInput.current?.click()} disabled={wordBusy}>
                    <FileText aria-hidden /> Word
                  </Button>
                </div>
              }
            />
          ) : (
            rows.map((row, i) => (
              <BlockCard
                key={row.id}
                row={row}
                n={i + 1}
                total={rows.length}
                open={openIds.has(row.id)}
                autoFocus={focusId === row.id}
                onToggle={toggle}
                onEdit={edit}
                onAction={onAction}
              />
            ))
          )}
          {rows.length > 0 && (
            <button
              type="button"
              onClick={() => void addBlank(rows.at(-1)?.id)}
              disabled={adding}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-line text-sm font-bold text-ink-dim transition hover:border-brand-bright/50 hover:text-brand-soft disabled:opacity-50"
            >
              {adding ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
              Бодлого нэмэх
            </button>
          )}
        </section>

        <aside aria-label="Гарын авлага" className="hidden lg:block">
          <div className="chunky sticky top-36 max-h-[calc(100dvh-10rem)] overflow-y-auto p-5">
            <GuidePanel onAdd={(blocks) => addParsed(blocks, "PASTE")} />
          </div>
        </aside>
      </div>

      <Drawer open={guideOpen} onOpenChange={setGuideOpen}>
        <DrawerContent>
          <DrawerTitle className="sr-only">Гарын авлага</DrawerTitle>
          <div className="overflow-y-auto px-5 pb-8 pt-4">
            <GuidePanel idPrefix="guide-m" onAdd={(blocks) => addParsed(blocks, "PASTE")} />
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog
        open={!!wordBlocks}
        onOpenChange={(open) => !open && setWordBlocks(null)}
        title="Word файлаас"
        description={wordBlocks ? `${wordBlocks.length} бодлого танигдлаа — нэмсний дараа засна` : undefined}
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setWordBlocks(null)}>
              Болих
            </Button>
            <Button
              disabled={wordBusy}
              onClick={async () => {
                if (!wordBlocks) return;
                setWordBusy(true);
                try {
                  await addParsed(wordBlocks, "WORD");
                  setWordBlocks(null);
                } catch {
                  /* toast-оор хэлсэн */
                } finally {
                  setWordBusy(false);
                }
              }}
            >
              {wordBusy ? <LoaderCircle className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
              {wordBlocks?.length ?? 0} бодлого нэмэх
            </Button>
          </>
        }
      >
        {wordBlocks && <ImportReview blocks={wordBlocks} />}
      </Dialog>

      {publishOpen && (
        <PublishDialog
          open={publishOpen}
          onOpenChange={setPublishOpen}
          set={meta}
          rows={rows}
          beforePublish={flushAll}
          onPublished={() => void reload()}
          onJump={(blockId) => {
            setPublishOpen(false);
            openBlock(blockId);
          }}
        />
      )}
      {settingsOpen && (
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          set={meta}
          onChange={(patch, chapter) => {
            updateMeta(patch);
            if (chapter !== undefined)
              setMeta((m) => (m ? { ...m, chapter: chapter ? { id: chapter.id, title: chapter.title, bookCode: null, bookTitle: null } : null } : m));
          }}
        />
      )}
      <HistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} events={meta.events} />
      <Dialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Ноорогийг устгах уу?"
        description={`«${meta.title}» болон ${rows.length} бодлого жагсаалтаас хасагдана — нийтэлсэн бодлого, тест хэвээр үлдэнэ`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Болих
            </Button>
            <Button variant="danger" onClick={() => void deleteSet()}>
              <Trash2 aria-hidden /> Устгах
            </Button>
          </>
        }
      >
        <span />
      </Dialog>
    </div>
  );
}

/** Нэр — урт бол мөр шилжинэ (input шиг тайрагдахгүй) */
function TitleInput({ value, onChange }: { value: string; onChange: (title: string, delay?: number) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      id="draft-title"
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, " "))}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onBlur={(e) => {
        if (!e.target.value.trim()) onChange("Шинэ ноорог", 0);
      }}
      maxLength={200}
      className="cyrillic-heading -mx-2 min-w-0 flex-1 basis-64 resize-none overflow-hidden rounded-xl bg-transparent px-2 py-1 text-2xl font-extrabold leading-tight tracking-tight text-ink transition hover:bg-ink/[0.03] focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-bright/30 sm:text-[28px]"
    />
  );
}

function EditorSkeleton() {
  return (
    <div role="status" aria-label="Ноорогийг нээж байна" className="space-y-4">
      <SkeletonLine width={112} height={16} />
      <SkeletonLine width="60%" height={36} />
      <SkeletonLine width="40%" height={20} />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-6">
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="chunky space-y-3 p-5">
              <SkeletonLine width={40} height={40} />
              <SkeletonLine width="90%" />
              <SkeletonLine width="70%" />
            </div>
          ))}
        </div>
        <div className="chunky hidden h-96 lg:block" />
      </div>
    </div>
  );
}

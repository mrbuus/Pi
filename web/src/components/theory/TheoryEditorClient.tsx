"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, ArrowLeft } from "lucide-react";
import { LoadingState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";
import RequireRole from "@/components/nav/RequireRole";
import ConfirmDialog from "./ConfirmDialog";
import TheoryBlockEditor from "./TheoryBlockEditor";
import TheoryBlockList from "./TheoryBlockList";
import type { Book, Chapter, Subject, TheoryBlock } from "./types";

const SUBJECTS: { v: Subject; t: string }[] = [
  { v: "MATH", t: "Математик" },
  { v: "SOCIAL_STUDIES", t: "Нийгмийн ухаан" },
];

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

// GET /lessons/:chapterId-ийн хариу янз бүрийн бүтэцтэй ирж болзошгүй тул
// (массив шууд, эсвэл { theories }/{ theoryBlocks } гэх мэт объект) аль ч
// хэлбэрийг эвдрэлгүй уншина.
function normalizeTheories(res: unknown): TheoryBlock[] {
  if (Array.isArray(res)) return res as TheoryBlock[];
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    const arr = obj.theories ?? obj.theoryBlocks ?? obj.blocks;
    if (Array.isArray(arr)) return arr as TheoryBlock[];
  }
  return [];
}

const inputCls =
  "rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-brand";

export default function TheoryEditorClient() {
  const [subject, setSubject] = useState<Subject>("MATH");

  const [books, setBooks] = useState<Book[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [booksError, setBooksError] = useState<string | null>(null);
  const [bookId, setBookId] = useState("");

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [chaptersError, setChaptersError] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState("");

  const [blocks, setBlocks] = useState<TheoryBlock[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [blocksError, setBlocksError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null); // "__new__" эсвэл блокийн id
  const [dirty, setDirty] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [toast, setToast] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const [pendingNav, setPendingNav] = useState<null | (() => void)>(null);
  const [deleteTarget, setDeleteTarget] = useState<TheoryBlock | null>(null);
  // beforeunload listener нэг л удаа бүртгэгдэж, dirty өөрчлөгдөх бүрд
  // дахин sub/unsubscribe хийхгүйн тулд заавал ref хэрэгтэй — гэхдээ
  // render-ийн явцад бус, effect дотор л sync хийнэ (React Hooks дүрэм).
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  const loadVersions = useRef({ books: 0, chapters: 0, blocks: 0 });

  // --- Ном ---
  const loadBooks = useCallback(() => {
    const version = ++loadVersions.current.books;
    setBooksLoading(true);
    setBooksError(null);
    api<Book[]>(`/books?subject=${subject}`)
      .then((bs) => {
        if (version !== loadVersions.current.books) return;
        setBooks(bs);
        setBookId((id) =>
          bs.some((b) => b.id === id) ? id : (bs[0]?.id ?? ""),
        );
      })
      .catch((e) => {
        if (version === loadVersions.current.books) setBooksError(errMsg(e));
      })
      .finally(() => {
        if (version === loadVersions.current.books) setBooksLoading(false);
      });
  }, [subject]);
  useEffect(() => {
    loadBooks();
    return () => {
      loadVersions.current.books++;
    };
  }, [loadBooks]);

  // --- Бүлэг сэдэв ---
  const loadChapters = useCallback(() => {
    const version = ++loadVersions.current.chapters;
    if (!bookId) {
      setChapters([]);
      setChapterId("");
      return;
    }
    setChaptersLoading(true);
    setChaptersError(null);
    api<Chapter[]>(`/chapters?bookId=${bookId}`)
      .then((cs) => {
        if (version !== loadVersions.current.chapters) return;
        setChapters(cs);
        setChapterId((id) =>
          cs.some((c) => c.id === id) ? id : (cs[0]?.id ?? ""),
        );
      })
      .catch((e) => {
        if (version === loadVersions.current.chapters)
          setChaptersError(errMsg(e));
      })
      .finally(() => {
        if (version === loadVersions.current.chapters)
          setChaptersLoading(false);
      });
  }, [bookId]);
  useEffect(() => {
    loadChapters();
    return () => {
      loadVersions.current.chapters++;
    };
  }, [loadChapters]);

  // --- Онолын блокууд ---
  const loadBlocks = useCallback(() => {
    const version = ++loadVersions.current.blocks;
    if (!chapterId) {
      setBlocks([]);
      return;
    }
    setBlocksLoading(true);
    setBlocksError(null);
    api<unknown>(`/lessons/${chapterId}`)
      .then((res) => {
        if (version !== loadVersions.current.blocks) return;
        const list = normalizeTheories(res)
          .slice()
          .sort((a, b) => a.order - b.order);
        setBlocks(list);
      })
      .catch((e) => {
        if (version === loadVersions.current.blocks) setBlocksError(errMsg(e));
      })
      .finally(() => {
        if (version === loadVersions.current.blocks) setBlocksLoading(false);
      });
  }, [chapterId]);
  useEffect(() => {
    setSelectedId(null);
    setDirty(false);
    loadBlocks();
    return () => {
      loadVersions.current.blocks++;
    };
  }, [loadBlocks]);

  // --- Хуудаснаас гарахад хадгалаагүй өөрчлөлтийн сэрэмжлүүлэг ---
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current) e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // dirty үед аливаа сэлгэлтийн (сонгосон блок, бүлэг сэдэв, ном, back-link)
  // өмнө нэвтрүүлдэг хамгаалалт — зөвшөөрвөл `action`-г шууд гүйцэтгэнэ.
  // Энгийн функц бүрт render болгонд шинэчлэгддэг тул `dirty`-г шууд (ref-гүй)
  // ашиглаж болно — зөвхөн доорх beforeunload listener-т л ref хэрэгтэй.
  function guardedNavigate(action: () => void) {
    if (dirty) {
      setPendingNav(() => action);
    } else {
      action();
    }
  }

  function selectBlock(id: string | null) {
    guardedNavigate(() => setSelectedId(id));
  }

  function changeChapter(id: string) {
    guardedNavigate(() => setChapterId(id));
  }
  function changeBook(id: string) {
    guardedNavigate(() => setBookId(id));
  }
  function changeSubject(s: Subject) {
    guardedNavigate(() => setSubject(s));
  }

  async function handleMove(id: string, direction: "up" | "down") {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= blocks.length) return;
    const next = blocks.slice();
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    setBlocks(next); // өөдрөг (optimistic) шинэчлэлт
    setReordering(true);
    try {
      await api(`/lessons/${chapterId}/theory/reorder`, {
        method: "PATCH",
        body: { ids: next.map((b) => b.id) },
      });
    } catch (e) {
      setToast({ kind: "error", text: errMsg(e) });
      loadBlocks(); // алдаа гарвал серверийн бодит дараалалтай эргэж синк хийнэ
    } finally {
      setReordering(false);
    }
  }

  async function handleDelete(block: TheoryBlock) {
    try {
      await api(`/lessons/theory/${block.id}`, { method: "DELETE" });
      setToast({ kind: "success", text: `"${block.title}" устгагдлаа` });
      setDeleteTarget(null);
      if (selectedId === block.id) setSelectedId(null);
      loadBlocks();
    } catch (e) {
      setToast({ kind: "error", text: errMsg(e) });
    }
  }

  function handleSaved() {
    setDirty(false);
    setToast({ kind: "success", text: "Хадгалагдлаа" });
    setSelectedId(null);
    loadBlocks();
  }

  const selectedBlock =
    selectedId && selectedId !== "__new__"
      ? (blocks.find((b) => b.id === selectedId) ?? null)
      : null;
  const editorOpen = selectedId === "__new__" || !!selectedBlock;

  return (
    <RequireRole allow={["ADMIN", "TEACHER_PLUS", "TEACHER"]}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/app/admin"
            onClick={(e) => {
              if (dirty) {
                e.preventDefault();
                guardedNavigate(() => {
                  window.location.href = "/app/admin";
                });
              }
            }}
            className="inline-flex items-center gap-1.5 text-sm text-ink-dim hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Удирдлага
          </Link>
          <h1 className="text-2xl font-extrabold">Онолын агуулга удирдах</h1>
          {toast && (
            <span
              role="status"
              className={`flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
                toast.kind === "error"
                  ? "bg-error/10 text-error"
                  : "bg-success/10 text-success"
              }`}
            >
              {toast.kind === "error" ? (
                <AlertTriangle size={14} aria-hidden="true" />
              ) : (
                <Check size={14} aria-hidden="true" />
              )}
              {toast.text}
            </span>
          )}
        </div>

        {/* Сэдэв / Ном / Бүлэг сэдэв сонгох */}
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-3 font-bold text-brand-soft">
            1. Бүлэг сэдэв сонгох
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1.5">
              {SUBJECTS.map((s) => (
                <button
                  key={s.v}
                  onClick={() => changeSubject(s.v)}
                  className={`min-h-11 rounded-full px-3 py-1 text-xs transition ${
                    subject === s.v
                      ? "bg-brand-bright text-on-brand"
                      : "border border-line text-ink-dim hover:border-brand"
                  }`}
                >
                  {s.t}
                </button>
              ))}
            </div>

            <label className="sr-only" htmlFor="theory-book-select">
              Ном
            </label>
            <select
              id="theory-book-select"
              value={bookId}
              onChange={(e) => changeBook(e.target.value)}
              className={`bg-bg w-full max-w-full sm:w-auto ${inputCls}`}
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title.replace(/\s*·\s*/g, " — ")}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="theory-chapter-select">
              Бүлэг сэдэв
            </label>
            <select
              id="theory-chapter-select"
              value={chapterId}
              onChange={(e) => changeChapter(e.target.value)}
              disabled={!chapters.length}
              className={`bg-bg w-full max-w-full sm:w-auto ${inputCls}`}
            >
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                  {c._count?.theories !== undefined
                    ? ` (${c._count.theories})`
                    : ""}
                  {c.freePreview ? " — үнэгүй" : ""}
                </option>
              ))}
            </select>
          </div>

          {booksLoading && (
            <p
              className="mt-2 animate-pulse text-sm text-ink-dim"
              role="status"
            >
              Номын жагсаалт ачаалж байна…
            </p>
          )}
          {booksError && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
              <AlertTriangle
                size={16}
                className="shrink-0"
                aria-hidden="true"
              />
              <span>{booksError}</span>
              <button
                onClick={loadBooks}
                className="min-h-11 rounded-lg border border-error/40 px-3 py-2 text-xs font-semibold transition hover:bg-error/10"
              >
                Дахин ачаалах
              </button>
            </div>
          )}
          {!booksLoading && !booksError && books.length === 0 && (
            <p className="mt-2 text-sm text-ink-dim">
              Энэ хичээлээр ном алга. Эхлээд{" "}
              <Link
                href="/app/admin/content"
                className="text-brand hover:underline"
              >
                Контент удирдах
              </Link>{" "}
              хуудаснаас ном/бүлэг сэдэв үүсгэнэ үү.
            </p>
          )}
          {chaptersLoading && (
            <p
              className="mt-2 animate-pulse text-sm text-ink-dim"
              role="status"
            >
              Бүлэг сэдвийн жагсаалт ачаалж байна…
            </p>
          )}
          {chaptersError && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
              <AlertTriangle
                size={16}
                className="shrink-0"
                aria-hidden="true"
              />
              <span>{chaptersError}</span>
              <button
                onClick={loadChapters}
                className="min-h-11 rounded-lg border border-error/40 px-3 py-2 text-xs font-semibold transition hover:bg-error/10"
              >
                Дахин ачаалах
              </button>
            </div>
          )}
        </section>

        {/* Онолын блокууд */}
        {chapterId && (
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-3 font-bold text-brand-soft">
              2. Онолын блокууд
            </h2>

            {blocksLoading && <LoadingState rows={3} label="Ачаалж байна" />}
            {blocksError && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
                <AlertTriangle
                  size={16}
                  className="shrink-0"
                  aria-hidden="true"
                />
                <span>{blocksError}</span>
                <button
                  onClick={loadBlocks}
                  className="min-h-11 rounded-lg border border-error/40 px-3 py-2 text-xs font-semibold transition hover:bg-error/10"
                >
                  Дахин ачаалах
                </button>
              </div>
            )}

            {!blocksLoading &&
              !blocksError &&
              blocks.length === 0 &&
              !editorOpen && (
                <div className="rounded-lg border border-dashed border-line p-5 text-center">
                  <p className="font-semibold text-ink">
                    Энэ бүлэгт онолын блок алга
                  </p>
                  <p className="mx-auto mt-1 max-w-md text-sm text-ink-dim">
                    Онолын блок гэдэг нь сурагчид бүлэг сэдвийг судлахад унших
                    тайлбар, томьёо, жишээ агуулсан хэсэг юм — видео, бодлогын
                    өмнө сурагч эхлээд үүнийг уншина. Доорх товчоор эхний блокоо
                    нэмнэ үү.
                  </p>
                  <button
                    onClick={() => selectBlock("__new__")}
                    className="mt-4 rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold text-on-brand"
                  >
                    + Эхний блокоо нэмэх
                  </button>
                </div>
              )}

            {!blocksLoading &&
              !blocksError &&
              (blocks.length > 0 || editorOpen) && (
                <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
                  <TheoryBlockList
                    blocks={blocks}
                    selectedId={selectedId}
                    reordering={reordering}
                    onSelect={selectBlock}
                    onMove={handleMove}
                    onDelete={setDeleteTarget}
                    onCreateNew={() => selectBlock("__new__")}
                  />

                  <div>
                    {editorOpen ? (
                      <TheoryBlockEditor
                        key={selectedBlock?.id ?? "new"}
                        chapterId={chapterId}
                        block={selectedBlock}
                        onSaved={handleSaved}
                        onCancel={() => selectBlock(null)}
                        onDirtyChange={setDirty}
                      />
                    ) : (
                      <p className="text-sm text-ink-dim">
                        Зүүн талын жагсаалтаас блок сонгоно уу, эсвэл шинээр
                        нэмнэ үү.
                      </p>
                    )}
                  </div>
                </div>
              )}
          </section>
        )}

        <ConfirmDialog
          open={!!deleteTarget}
          title="Онолын блок устгах"
          description={
            deleteTarget
              ? `"${deleteTarget.title}" блокийг устгах уу? Энэ үйлдлийг буцаах боломжгүй.`
              : undefined
          }
          confirmLabel="Устгах"
          danger
          onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />

        <ConfirmDialog
          open={!!pendingNav}
          title="Хадгалаагүй өөрчлөлт байна"
          description="Одоо хийж буй өөрчлөлтөө хадгалаагүй байна. Гарвал өөрчлөлт устана."
          confirmLabel="Хаяад гарах"
          danger
          onConfirm={() => {
            setDirty(false);
            pendingNav?.();
            setPendingNav(null);
          }}
          onCancel={() => setPendingNav(null)}
        />
      </div>
    </RequireRole>
  );
}

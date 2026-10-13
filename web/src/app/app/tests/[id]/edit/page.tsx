"use client";

import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Library, ListPlus } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, getRole, uploadFile } from "@/lib/api";
import { useUndoable, useUnsavedGuard } from "@/hooks/useUndoable";
import { usePresence } from "@/hooks/usePresence";
import { versionConflictOf, type VersionConflict } from "@/lib/revisions";
import ConflictDialog from "@/components/history/ConflictDialog";
import TestHistoryDialog from "@/components/history/TestHistoryDialog";
import { mergedNotice, showSavedToast } from "@/components/history/saveToast";
import RequireRole from "@/components/nav/RequireRole";
import ProblemPreviewModal from "@/components/test-builder/ProblemPreviewModal";
import type { Problem } from "@/components/test-builder/types";
import BankDialog from "@/components/test-editor/BankDialog";
import EditorToolbar, { type NavChip } from "@/components/test-editor/EditorToolbar";
import ProblemBlock, { type InsertKind } from "@/components/test-editor/ProblemBlock";
import SettingsCard, { type Chapter, type Classroom } from "@/components/test-editor/SettingsCard";
import {
  contentOf,
  contentPatch,
  insertItems,
  moveItem,
  newContent,
  planSave,
  removeItem,
  statsOf,
  tokenPrefix,
  validateContent,
  type BlockContent,
  type BlockItem,
  type EditorState,
  type ServerProblem,
  type TestSettings,
} from "@/components/test-editor/model";
import { Button } from "@/components/ui/kit/button";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";

/* ============================================================================
 * Тест засах — 40 блок (docs/v2/TEST-ZASAH-BLOK.md, эзний хүсэлт 2026-10-11):
 * бодлогууд эхэнд блок болж харагдана, блок бүрээс LaTeX, хариу, оноо, зураг,
 * байрлал, дээр/доор нэмэх, хасах. Дээр үргэлж харагдах мөрөнд ↶ ↷, Хадгалах,
 * дугаараар үсрэх. Бүх засвар нэг буцаах стект (Cmd+Z), нэг «Хадгалах».
 * ========================================================================== */

interface TestDetails {
  id: string;
  title: string;
  type: string;
  gradingMode: string;
  chapterId: string | null;
  timeLimitMin: number | null;
  groupKey: string | null;
  variantLabel: string | null;
  pdfKey: string | null;
  price: number | null;
  version?: number;
  chapter?: { book?: { subject?: string | null } | null } | null;
  problems: { problemId: string; order: number; points: number; problem: ServerProblem }[];
  access: { classroomId: string }[];
}

type EditInfo = { mode: "FULL" | "LIMITED"; reason: string };

const EMPTY_SETTINGS: TestSettings = {
  title: "",
  type: "DAILY",
  gradingMode: "AUTO",
  chapterId: "",
  subject: "",
  timeLimit: "",
  groupKey: "",
  variantLabel: "",
  pdfKey: "",
  price: "",
};
const EMPTY: EditorState = { settings: EMPTY_SETTINGS, items: [], classes: [], drafts: {} };
const NEW_FALLBACK = newContent("CHOICE");

function stateFrom(d: TestDetails): EditorState {
  return {
    settings: {
      title: d.title,
      type: d.type,
      gradingMode: d.gradingMode,
      chapterId: d.chapterId ?? "",
      subject: d.chapter?.book?.subject ?? "",
      timeLimit: d.timeLimitMin?.toString() ?? "",
      groupKey: d.groupKey ?? "",
      variantLabel: d.variantLabel ?? "",
      pdfKey: d.pdfKey ?? "",
      price: d.price?.toString() ?? "",
    },
    items: d.problems.map((p) => ({ key: p.problemId, problemId: p.problemId, points: p.points })),
    classes: d.access.map((a) => a.classroomId),
    drafts: {},
  };
}

function rand4(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function isChanged(item: BlockItem, drafts: Record<string, BlockContent>, original: BlockContent | undefined) {
  if (!item.problemId) return true;
  const draft = drafts[item.key];
  if (!draft || !original) return false;
  return Object.keys(contentPatch(original, draft)).length > 0;
}

export default function EditTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const role = getRole();
  const isAdmin = role === "ADMIN";
  const canEditContent = role === "ADMIN" || role === "TEACHER_PLUS";

  const [test, setTest] = useState<TestDetails | null>(null);
  const [editInfo, setEditInfo] = useState<EditInfo | null>(null);
  const [originals, setOriginals] = useState<Record<string, ServerProblem>>({});
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [version, setVersion] = useState(0);
  const [active, setActive] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<VersionConflict | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [bankAt, setBankAt] = useState<number | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const newSeq = useRef(0);

  const form = useUndoable<EditorState>(EMPTY, {
    shortcuts: !conflict && !historyOpen && previewKey === null && bankAt === null,
  });
  const resetForm = form.reset;
  const setForm = form.set;
  const { settings, items, classes, drafts } = form.value;
  useUnsavedGuard(form.dirty, "test-editor");
  const presence = usePresence([`test-edit:${id}`]);

  const loadPage = useCallback(() => {
    setPageLoading(true);
    setPageError("");
    Promise.all([api<TestDetails>(`/tests/${id}`), api<EditInfo>(`/tests/${id}/edit-info`)])
      .then(([details, info]) => {
        setTest(details);
        setEditInfo(info);
        setVersion(details.version ?? 0);
        setOriginals(Object.fromEntries(details.problems.map((p) => [p.problemId, p.problem])));
        resetForm(stateFrom(details));
        setErrors({});
        setActive(null);
      })
      .catch((e: unknown) => setPageError(e instanceof Error ? e.message : "Тестийн мэдээлэл ачаалж чадсангүй"))
      .finally(() => setPageLoading(false));
  }, [id, resetForm]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) loadPage();
    });
    return () => {
      cancelled = true;
    };
  }, [loadPage]);

  // Анги, бүлгийн жагсаалт — тохиргоог нээхэд л (бодлого засахад хэрэггүй)
  const loadCatalog = useCallback(() => {
    if (catalogLoading) return;
    setCatalogLoading(true);
    Promise.all([
      api<Classroom[]>("/classrooms"),
      api<Chapter[]>(`/chapters${settings.subject ? `?subject=${encodeURIComponent(settings.subject)}` : ""}`),
    ])
      .then(([c, ch]) => {
        setClassrooms(c);
        setChapters(ch);
      })
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Жагсаалт ачаалж чадсангүй"))
      .finally(() => setCatalogLoading(false));
  }, [catalogLoading, settings.subject]);

  const originalContents = useMemo(
    () => Object.fromEntries(Object.entries(originals).map(([pid, p]) => [pid, contentOf(p)])),
    [originals],
  ) as Record<string, BlockContent>;
  const contentOfItem = useCallback(
    (item: BlockItem, d: Record<string, BlockContent>): BlockContent =>
      d[item.key] ?? (item.problemId ? originalContents[item.problemId] : undefined) ?? NEW_FALLBACK,
    [originalContents],
  );

  const thousand = test?.type === "THOUSAND";
  const limited = editInfo?.mode === "LIMITED";
  const saveCtx = useMemo(
    () => ({
      originals,
      mode: (editInfo?.mode ?? "FULL") as "FULL" | "LIMITED",
      isAdmin,
      thousand,
      chapterId: settings.chapterId || test?.chapterId || null,
      makeToken: () => "",
    }),
    [originals, editInfo?.mode, isAdmin, thousand, settings.chapterId, test?.chapterId],
  );
  const plan = useMemo(() => planSave(form.value, form.baseline, saveCtx), [form.value, form.baseline, saveCtx]);
  const dirtyCount = plan.creates.length + plan.updates.length + (plan.test ? 1 : 0);

  const stats = useMemo(
    () => statsOf(items, (item) => contentOfItem(item, drafts).format),
    [items, drafts, contentOfItem],
  );
  const chips: NavChip[] = useMemo(
    () =>
      items.map((item) => ({
        key: item.key,
        changed: isChanged(item, drafts, item.problemId ? originalContents[item.problemId] : undefined),
        error: !!errors[item.key],
      })),
    [items, drafts, originalContents, errors],
  );

  // ---------------- Блокийн үйлдлүүд (тогтвортой — блок memo) ----------------
  const jump = useCallback((key: string) => {
    setActive(key);
    requestAnimationFrame(() =>
      document.getElementById(`block-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }, []);
  const toggleActive = useCallback((key: string) => setActive((prev) => (prev === key ? null : key)), []);
  const onContent = useCallback(
    (key: string, patch: Partial<BlockContent>, coalesceKey?: string) => {
      setForm(
        (prev) => {
          const item = prev.items.find((i) => i.key === key);
          if (!item) return prev;
          const current = contentOfItem(item, prev.drafts);
          return { ...prev, drafts: { ...prev.drafts, [key]: { ...current, ...patch } } };
        },
        { coalesceKey },
      );
      setErrors((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [setForm, contentOfItem],
  );
  const onCommit = form.commitGroup;
  const onPoints = useCallback(
    (key: string, points: number) =>
      setForm(
        (prev) => ({ ...prev, items: prev.items.map((i) => (i.key === key ? { ...i, points } : i)) }),
        { coalesceKey: `pts-${key}` },
      ),
    [setForm],
  );
  const onMove = useCallback(
    (key: string, to: number) => {
      setForm((prev) => ({ ...prev, items: moveItem(prev.items, key, to) }));
      requestAnimationFrame(() =>
        document.getElementById(`block-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    },
    [setForm],
  );
  const onRemove = useCallback(
    (key: string) => {
      setForm((prev) => {
        const nextDrafts = { ...prev.drafts };
        delete nextDrafts[key];
        return { ...prev, items: removeItem(prev.items, key), drafts: nextDrafts };
      });
      setActive(null);
      toast("Тестээс хаслаа", { description: "Буцаах бол Cmd+Z эсвэл ↶" });
    },
    [setForm],
  );
  const onInsert = useCallback(
    (index: number, kind: InsertKind) => {
      if (kind === "BANK") {
        setBankAt(index);
        return;
      }
      newSeq.current += 1;
      const key = `new-${newSeq.current}-${Date.now().toString(36)}`;
      setForm((prev) => ({
        ...prev,
        items: insertItems(prev.items, index, [{ key, problemId: null, points: 1 }]),
        drafts: { ...prev.drafts, [key]: newContent(kind) },
      }));
      jump(key);
    },
    [setForm, jump],
  );
  const onPreview = useCallback((key: string) => setPreviewKey(key), []);

  function addFromBank(index: number, problems: ServerProblem[]) {
    if (problems.length === 0) return;
    setOriginals((prev) => ({ ...prev, ...Object.fromEntries(problems.map((p) => [p.id, p])) }));
    setForm((prev) => ({
      ...prev,
      items: insertItems(
        prev.items,
        index,
        problems.map((p) => ({ key: p.id, problemId: p.id, points: p.points ?? 1 })),
      ),
    }));
    toast.success(`${problems.length} бодлого нэмлээ`);
    jump(problems[0].id);
  }

  async function duplicateTest() {
    setDuplicating(true);
    try {
      const copy = await api<{ id: string; title: string }>(`/tests/${id}/duplicate`, { method: "POST" });
      toast.success(`«${copy.title}» ноорог болж үүслээ. Анги сонгож хадгалахад нийтлэгдэнэ.`);
      router.push(`/app/tests/${copy.id}/edit`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Хуулж чадсангүй");
    } finally {
      setDuplicating(false);
    }
  }

  async function uploadPdf(file: File) {
    setUploadingPdf(true);
    try {
      const { key } = await uploadFile(file);
      setForm((prev) => ({ ...prev, settings: { ...prev.settings, pdfKey: key } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Файл байршуулахад алдаа гарлаа");
    } finally {
      setUploadingPdf(false);
    }
  }

  // ---------------- Хадгалах ----------------
  async function save(overwrite = false) {
    if (!test || !editInfo) return;
    const state = form.value;
    if (!state.settings.title.trim()) {
      toast.error("Тестийн нэр оруулна уу");
      return;
    }
    // Өөрчилсөн болон шинэ блокийг шалгана
    const errs: Record<string, string> = {};
    for (const item of state.items) {
      if (!isChanged(item, state.drafts, item.problemId ? originalContents[item.problemId] : undefined)) continue;
      const msg = validateContent(contentOfItem(item, state.drafts));
      if (msg) errs[item.key] = msg;
    }
    setErrors(errs);
    const firstError = state.items.find((i) => errs[i.key]);
    if (firstError) {
      toast.error(`${Object.keys(errs).length} бодлогод засах зүйл байна`);
      jump(firstError.key);
      return;
    }
    if (state.items.some((i) => !i.problemId) && !(state.settings.chapterId || test.chapterId)) {
      toast.error("Шинэ бодлого нэмэхэд тестийн бүлэг сэдэв хэрэгтэй («Тохиргоо»)");
      return;
    }

    const prefix = tokenPrefix(
      state.items.map((i) => (i.problemId ? originals[i.problemId]?.token : undefined)).filter(Boolean) as string[],
    );
    const p = planSave(state, form.baseline, { ...saveCtx, makeToken: () => `${prefix}-N${rand4()}` });
    if (!p.creates.length && !p.updates.length && !p.test) return;

    setSaving(true);
    const created: Record<string, ServerProblem> = {};
    const merged = new Set<string>();
    let step: string | null = null;
    try {
      for (const c of p.creates) {
        step = c.key;
        const draft = state.drafts[c.key];
        let res: ServerProblem;
        try {
          res = await api<ServerProblem>("/problems", { method: "POST", body: c.body });
        } catch (e) {
          // token давхардсан (маш ховор) — шинэ token-оор нэг удаа дахин
          if (!(e instanceof ApiError && e.status === 409)) throw e;
          res = await api<ServerProblem>("/problems", {
            method: "POST",
            body: { ...c.body, token: `${prefix}-N${rand4()}` },
          });
        }
        created[c.key] = {
          ...res,
          statementText: draft.statement,
          imageKey: draft.imageKey,
          choiceOptions: draft.choices.map((ch, i) => ({ order: i + 1, text: ch.text, isCorrect: ch.isCorrect })),
          correctAnswer: draft.format === "CHOICE" ? undefined : draft.fill,
          version: 0,
        };
      }
      for (const u of p.updates) {
        step = u.key;
        const res = await api<{ mergedWith?: string[] | null }>(`/problems/${u.problemId}`, {
          method: "PATCH",
          body: {
            ...u.body,
            ...(u.expectedVersion !== undefined ? { expectedVersion: u.expectedVersion } : {}),
            ...(overwrite ? { overwrite: true } : {}),
          },
        });
        res.mergedWith?.forEach((n) => merged.add(n));
      }
      let testRes: { version?: number; changed?: boolean; mergedWith?: string[] | null } | null = null;
      if (p.test) {
        step = null;
        const body: Record<string, unknown> = { ...p.test };
        if (Array.isArray(body.problems)) {
          body.problems = (body.problems as { problemId: string; order: number; points: number }[]).map((row) => ({
            ...row,
            problemId: created[row.problemId]?.id ?? row.problemId,
          }));
        }
        testRes = await api(`/tests/${id}`, {
          method: "PATCH",
          body: { ...body, expectedVersion: version, ...(overwrite ? { overwrite: true } : {}) },
        });
        testRes?.mergedWith?.forEach((n) => merged.add(n));
      }
      setConflict(null);
      const notice = mergedNotice(merged.size ? [...merged] : null);
      const parts = [
        p.creates.length && `${p.creates.length} шинэ бодлого`,
        p.updates.length && `${p.updates.length} бодлого засагдлаа`,
      ].filter(Boolean);
      if (testRes && testRes.version !== undefined) {
        showSavedToast({
          entity: "TEST",
          id,
          previousVersion: version,
          savedVersion: testRes.version,
          changed: testRes.changed,
          mergedWith: testRes.mergedWith,
          onUndone: () => loadPage(),
        });
        if (parts.length) toast.success(parts.join(", "));
      } else {
        toast.success("Хадгаллаа", { description: [parts.join(", "), notice].filter(Boolean).join(". ") });
      }
      loadPage();
    } catch (e) {
      // Хэсэгчлэн амжсан: үүссэн бодлогыг дахин үүсгэхгүй — блокыг тэр бодлого руу холбоно
      if (Object.keys(created).length) {
        setOriginals((prev) => ({
          ...prev,
          ...Object.fromEntries(Object.values(created).map((c) => [c.id, c])),
        }));
        form.replace((prev) => {
          const nextDrafts = { ...prev.drafts };
          for (const key of Object.keys(created)) delete nextDrafts[key];
          return {
            ...prev,
            items: prev.items.map((i) => (created[i.key] ? { ...i, key: created[i.key].id, problemId: created[i.key].id } : i)),
            drafts: nextDrafts,
          };
        });
      }
      const info = versionConflictOf(e);
      const message = info?.message ?? (e instanceof Error ? e.message : "Хадгалж чадсангүй");
      if (step) {
        setErrors((prev) => ({ ...prev, [step as string]: message }));
        jump(step);
      }
      if (info) setConflict(info);
      else toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  // ---------------- Харагдац ----------------
  if (pageLoading && !test)
    return (
      <RequireRole allow={["ADMIN", "TEACHER_PLUS", "TEACHER"]}>
        <LoadingState rows={6} label="Тестийг ачаалж байна" />
      </RequireRole>
    );
  if (pageError || !test || !editInfo)
    return (
      <RequireRole allow={["ADMIN", "TEACHER_PLUS", "TEACHER"]}>
        <ErrorState message={pageError || "Тест олдсонгүй"} onRetry={loadPage} />
      </RequireRole>
    );

  const previewItem = previewKey ? items.find((i) => i.key === previewKey) : undefined;
  const previewContent = previewItem ? contentOfItem(previewItem, drafts) : null;
  const previewProblem: Problem | null =
    previewItem && previewContent
      ? {
          id: previewItem.problemId ?? previewItem.key,
          token: previewItem.problemId ? (originals[previewItem.problemId]?.token ?? "") : "",
          format: previewContent.format,
          statementText: previewContent.statement,
          imageKey: previewContent.imageKey,
          choiceOptions: previewContent.choices.map((c, i) => ({ order: i + 1, text: c.text, isCorrect: c.isCorrect })),
          correctAnswer: previewContent.format === "CHOICE" ? undefined : previewContent.fill,
          points: previewItem.points,
        }
      : null;

  return (
    <RequireRole allow={["ADMIN", "TEACHER_PLUS", "TEACHER"]}>
      <div className="mx-auto max-w-5xl space-y-4">
        <h1 className="sr-only">Тест засах</h1>
        <EditorToolbar
          title={settings.title}
          stats={stats}
          timeLimit={Number(settings.timeLimit) || null}
          editors={presence[`test-edit:${id}`]}
          canUndo={form.canUndo}
          canRedo={form.canRedo}
          onUndo={form.undo}
          onRedo={form.redo}
          dirtyCount={dirtyCount}
          saving={saving}
          onSave={() => void save()}
          onHistory={() => setHistoryOpen(true)}
          onDuplicate={() => void duplicateTest()}
          duplicating={duplicating}
          chips={chips}
          activeKey={active}
          onJump={jump}
        />

        {limited && (
          <p className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
            Сурагч өгсөн тест — дараалал, оноо, нэмэх/хасах түгжээтэй. Нэр, хугацаа, бодлогын агуулгыг засна.
          </p>
        )}

        <SettingsCard
          settings={settings}
          limited={limited}
          thousand={thousand}
          isAdmin={isAdmin}
          classrooms={classrooms}
          chapters={chapters}
          classes={classes}
          catalogLoading={catalogLoading}
          onOpen={() => {
            if (classrooms.length === 0 && chapters.length === 0) loadCatalog();
          }}
          onChange={(patch, coalesceKey) =>
            setForm((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }), {
              coalesceKey: coalesceKey ? `set-${coalesceKey}` : undefined,
            })
          }
          onCommit={form.commitGroup}
          onToggleClass={(cid) =>
            setForm((prev) => ({
              ...prev,
              classes: prev.classes.includes(cid) ? prev.classes.filter((x) => x !== cid) : [...prev.classes, cid],
            }))
          }
          uploadingPdf={uploadingPdf}
          onUploadPdf={(file) => void uploadPdf(file)}
        />

        <section aria-label="Бодлогууд" className="space-y-3">
          {items.length === 0 && (
            <p className="rounded-2xl border border-dashed border-line p-6 text-center text-ink-dim">
              Энэ тестэд бодлого алга — доороос нэмнэ үү.
            </p>
          )}
          {items.map((item, index) => (
            <ProblemBlock
              key={item.key}
              index={index}
              total={items.length}
              item={item}
              problem={item.problemId ? (originals[item.problemId] ?? null) : null}
              content={contentOfItem(item, drafts)}
              changed={chips[index]?.changed ?? false}
              active={active === item.key}
              canEditContent={canEditContent}
              structureLocked={limited}
              answerLocked={limited}
              error={errors[item.key]}
              onActivate={toggleActive}
              onContent={onContent}
              onCommit={onCommit}
              onPoints={onPoints}
              onMove={onMove}
              onInsert={onInsert}
              onRemove={onRemove}
              onPreview={onPreview}
            />
          ))}
          {!limited && (
            <div className="flex flex-wrap gap-2 rounded-2xl border border-dashed border-line p-3">
              <span className="w-full text-sm font-semibold text-ink-dim">Төгсгөлд нэмэх</span>
              <Button variant="outline" size="sm" type="button" onClick={() => onInsert(items.length, "CHOICE")}>
                <ListPlus aria-hidden /> Шинэ сонгох
              </Button>
              <Button variant="outline" size="sm" type="button" onClick={() => onInsert(items.length, "FILL_NUMBER")}>
                <ListPlus aria-hidden /> Шинэ нөхөх
              </Button>
              <Button variant="outline" size="sm" type="button" onClick={() => onInsert(items.length, "BANK")}>
                <Library aria-hidden /> Сангаас
              </Button>
            </div>
          )}
        </section>
      </div>

      {previewProblem && (
        <ProblemPreviewModal problem={previewProblem} points={previewProblem.points} onClose={() => setPreviewKey(null)} />
      )}
      {bankAt !== null && (
        <BankDialog
          open
          onOpenChange={(o) => !o && setBankAt(null)}
          subject={settings.subject}
          defaultChapterId={settings.chapterId}
          excludeIds={new Set(items.map((i) => i.problemId).filter(Boolean) as string[])}
          onAdd={(problems) => addFromBank(bankAt, problems)}
        />
      )}
      <ConflictDialog
        conflict={conflict}
        busy={saving}
        onClose={() => setConflict(null)}
        onReload={() => {
          setConflict(null);
          loadPage();
        }}
        onOverwrite={() => void save(true)}
      />
      <TestHistoryDialog
        testId={id}
        title={test.title}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        dirty={form.dirty}
        onRestored={() => loadPage()}
      />
    </RequireRole>
  );
}

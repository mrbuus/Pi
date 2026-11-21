"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BarChart3, BookOpen, Eye, EyeOff, FileText, KeyRound, Table2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { api, getRole } from "@/lib/api";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import { Meta } from "@/components/ui/Meta";
import { ErrorState } from "@/components/ui/StateBlock";
import { SkeletonCard, SkeletonRows } from "@/components/ui/Skeleton";
import ExamDialog from "@/components/exams/ExamDialog";
import { errorText } from "@/components/exams/types";
import GroupTable from "./GroupTable";
import ImportPanel from "./ImportPanel";
import ItemEdit from "./ItemEdit";
import KeyEditor from "./KeyEditor";
import MaterialViewer from "./MaterialViewer";
import OverviewPanel from "./OverviewPanel";
import PaperGuide from "./PaperGuide";
import { dayText, type Board } from "./types";
import { useStaffCan } from "@/lib/staffCapabilities";

const ALL_TABS = [
  { value: "groups", label: "Ангиар", icon: Table2, manage: false },
  { value: "overview", label: "Тойм", icon: BarChart3, manage: false },
  // Бодлого бүр: тайлбар + (Багш+/Админ) сэдэв, агуулга, томьёо — тусдаа «Түлхүүр» табгүй (эзэн 2026-11-15)
  { value: "guide", label: "Бодлого", icon: BookOpen, manage: false },
  // Шалгалтын материал (лого усан тэмдэгтэй, зөвхөн харах) — багш эрхтэй бүх хүн хувилбар бүрийг
  { value: "material", label: "Материал", icon: FileText, manage: false },
  { value: "import", label: "Дүн оруулах", icon: Upload, manage: true },
] as const;
type BoardTab = (typeof ALL_TABS)[number]["value"];

/** Ажилтны нэгдсэн шалгалтын хуудас. Багш — өөрийн анги; Багш+/Админ — бүгд + удирдлага. */
export default function PaperBoard({ id }: { id: string }) {
  const router = useRouter();
  const role = getRole();
  const canManage = useStaffCan("exams.manage", role);
  const tabs = ALL_TABS.filter((t) => canManage || !t.manage);
  // Тайлбартай шалгалтад л «Бодлогын тайлбар» таб
  const [guideOpen, setGuideOpen] = useState<string | null>(() => new URLSearchParams(window.location.search).get("p"));
  const [tab, setTab] = useState<BoardTab>("groups");
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Сурагчдад нээх/нуух бүрд анхааруулга (эзэн 2026-11-21): зөвшөөрсний дараа л хийгдэнэ
  const [confirmOpen, setConfirmOpen] = useState<null | "publish" | "detail">(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<Board>(`/paper-exams/${encodeURIComponent(id)}`)
      .then((b) => {
        setError("");
        setBoard(b);
      })
      .catch((e) => setError(errorText(e, "Ачаалж чадсангүй")));
  }, [id]);
  useEffect(load, [load]);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("tab");
    const ok = tabs.find((t) => t.value === fromUrl);
    if (ok && ok.value !== "groups") {
      const t = window.setTimeout(() => setTab(ok.value), 0);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Таб, тайлбарын бодлого бүр түүхэнд нэмэгдэнэ — буцах товч өмнөх таб/жагсаалт руу (эзэн 2026-11-15)
  useEffect(() => {
    const onPop = () => {
      const params = new URLSearchParams(window.location.search);
      const t = ALL_TABS.find((x) => x.value === params.get("tab"));
      setTab(t ? t.value : "groups");
      setGuideOpen(params.get("p"));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const push = (next: { tab?: BoardTab; p?: string | null }) => {
    const url = new URL(window.location.href);
    if (next.tab !== undefined) {
      if (next.tab === "groups") url.searchParams.delete("tab");
      else url.searchParams.set("tab", next.tab);
    }
    if (next.p) url.searchParams.set("p", next.p);
    else url.searchParams.delete("p");
    window.history.pushState(window.history.state, "", url);
  };

  const changeTab = (v: string) => {
    const t = tabs.find((x) => x.value === v);
    if (!t || t.value === tab) return;
    setTab(t.value);
    setGuideOpen(null);
    push({ tab: t.value, p: null });
  };

  async function togglePublish() {
    if (!board) return;
    setBusy(true);
    try {
      await api(`/paper-exams/${encodeURIComponent(id)}`, { method: "PATCH", body: { published: !board.exam.published } });
      toast.success(board.exam.published ? "Сурагчдаас нуулаа" : "Сурагчдад нээлээ");
      load();
    } catch (e) {
      toast.error(errorText(e, "Өөрчилж чадсангүй"));
    } finally {
      setBusy(false);
    }
  }

  /** Сурагчид дэлгэрэнгүй (бодлого, материал, задаргаа, жагсаалт) нээх / зөвхөн зөв-буруу */
  async function toggleDetail() {
    if (!board) return;
    setBusy(true);
    try {
      await api(`/paper-exams/${encodeURIComponent(id)}`, { method: "PATCH", body: { studentDetail: !board.exam.studentDetail } });
      toast.success(board.exam.studentDetail ? "Сурагчид зөвхөн зөв, буруугаа харна" : "Сурагчид дэлгэрэнгүй нээлээ");
      load();
    } catch (e) {
      toast.error(errorText(e, "Өөрчилж чадсангүй"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api(`/paper-exams/${encodeURIComponent(id)}`, { method: "DELETE" });
      router.push("/app/paper-exams");
    } catch (e) {
      toast.error(errorText(e, "Устгаж чадсангүй"));
      setBusy(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!board) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonRows rows={8} />
      </div>
    );
  }
  const e = board.exam;
  const itemsKey = JSON.stringify(board.items);
  /** Тайлбарын бодлого бүрийн төвийн зөв %: сонгох → бодлогын %, нөхөх → багцуудын оноогоор жигнэсэн % */
  const guideStats: Record<string, number | null> = {};
  for (const [i, it] of board.items.entries()) {
    const pct = board.overall.items[i]?.pct ?? null;
    if (!it.label) guideStats[String(it.number)] = pct;
  }
  const byProblem = new Map<string, { w: number; sum: number }>();
  for (const [i, it] of board.items.entries()) {
    const m = it.label?.match(/^2\.(\d+)\./);
    const pct = board.overall.items[i]?.pct;
    if (!m || pct === null || pct === undefined) continue;
    const acc = byProblem.get(`II.${m[1]}`) ?? { w: 0, sum: 0 };
    acc.w += it.points;
    acc.sum += pct * it.points;
    byProblem.set(`II.${m[1]}`, acc);
  }
  for (const [k, v] of byProblem) guideStats[k] = v.w ? Math.round(v.sum / v.w) : null;
  /** Тайлбарын бодлого → шалгалтын бодлого(ууд): «12» → 12; «II.2» → 2.2.* багцууд */
  const itemsOf = (label: string, number: number | null) => {
    if (number !== null) return board.items.filter((i) => i.number === number);
    const m = label.match(/^II\.(\d+)$/);
    return m ? board.items.filter((i) => i.label?.startsWith(`2.${m[1]}.`)) : [];
  };

  return (
    <div className="space-y-4">
      <Link href="/app/paper-exams" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink-dim hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Нэгдсэн шалгалт
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="cyrillic-heading font-display text-2xl font-bold text-ink">{e.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Meta className="text-sm text-ink-dim" items={[dayText(e.heldOn), `${e.itemCount} бодлого`, `${board.overall.count} сурагч`]} />
            {e.published ? <Badge tone="success">Сурагчдад нээлттэй</Badge> : <Badge>Сурагчдад нээгээгүй</Badge>}
            {!e.studentDetail && <Badge tone="info">Сурагчид зөвхөн зөв, буруу</Badge>}
            {board.scope === "OWN_CLASSES" && <Badge tone="info">Таны ангийн сурагчид</Badge>}
          </div>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant={e.published ? "outline" : "default"} disabled={busy} onClick={() => setConfirmOpen("publish")}>
              {e.published ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
              {e.published ? "Сурагчдаас нуух" : "Сурагчдад нээх"}
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => setConfirmOpen("detail")}>
              {e.studentDetail ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
              {e.studentDetail ? "Дэлгэрэнгүйг нуух" : "Дэлгэрэнгүйг сурагчдад нээх"}
            </Button>
            <Button variant="ghost" size="icon" aria-label="Шалгалтыг устгах" onClick={() => setConfirmDelete(true)}>
              <Trash2 aria-hidden />
            </Button>
          </div>
        )}
      </div>

      <Tabs.Root value={tab} onValueChange={changeTab}>
        <Tabs.List aria-label="Шалгалтын хэсэг" className="flex gap-1 overflow-x-auto border-b border-line">
          {tabs.filter((t) => t.value !== "guide" || board.guideVariants.length > 0 || canManage).map(({ value, label, icon: Icon }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className="-mb-px inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 text-sm font-bold text-ink-dim transition-colors hover:text-ink data-[state=active]:border-brand-bright data-[state=active]:text-brand-soft"
            >
              <Icon className="size-4" aria-hidden />
              {label}
              {value === "import" && board.unmatched.length > 0 && (
                <Badge tone="warning" className="ml-1">
                  {board.unmatched.length}
                </Badge>
              )}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <div className="mt-4">
          <Tabs.Content value="groups">
            <GroupTable board={board} onChanged={load} />
          </Tabs.Content>
          <Tabs.Content value="overview">
            <OverviewPanel board={board} />
          </Tabs.Content>
          {board.guideVariants.length > 0 && (
            <Tabs.Content value="guide">
              <PaperGuide
                examId={id}
                variants={board.guideVariants}
                items={[]}
                stats={guideStats}
                editor={
                  canManage
                    ? (entry) => (
                        <ItemEdit
                          key={`${entry.label}:${itemsKey}`}
                          examId={id}
                          items={itemsOf(entry.label, entry.number)}
                          formulas={board.formulas}
                          topics={board.topicsList}
                          examTopics={[...new Set(board.items.flatMap((i) => (i.topic ? [i.topic] : [])))]}
                          onSaved={load}
                        />
                      )
                    : undefined
                }
                open={guideOpen}
                onOpen={(label) => {
                  if (label === guideOpen) return;
                  setGuideOpen(label);
                  push({ p: label });
                  window.scrollTo({ top: 0 });
                }}
              />
            </Tabs.Content>
          )}
          <Tabs.Content value="material">
            <StaffMaterial examId={id} title={board.exam.title} variants={board.guideVariants.length > 0 ? board.guideVariants : ["A", "B"]} />
          </Tabs.Content>
          {canManage && (
            <>
              {/* forceMount: таб солиход хадгалаагүй ноорог алдагдахгүй. key = бодлогын
                  тохиргоо — түлхүүр өөрчлөгдсөн үед л ноорог шинээр эхэлнэ (нийтлэх,
                  холбох зэрэг бусад дахин ачаалалт ноорогт хүрэхгүй) */}
              {/* Тайлбаргүй шалгалтад «Бодлого» таб нь хуучин түлхүүр засварлагч */}
              {board.guideVariants.length === 0 && (
              <Tabs.Content value="guide" forceMount className="data-[state=inactive]:hidden">
                <KeyEditor key={itemsKey} examId={id} items={board.items} formulas={board.formulas} topics={board.topicsList} onSaved={load} />
              </Tabs.Content>
              )}
              <Tabs.Content value="import">
                <ImportPanel examId={id} itemCount={e.itemCount} unmatched={board.unmatched} onChanged={load} items={board.items} variants={board.guideVariants.length ? board.guideVariants : ["A", "B"]} />
              </Tabs.Content>
            </>
          )}
        </div>
      </Tabs.Root>

      {confirmOpen && (
        <ExamDialog
          open
          onOpenChange={(o) => !o && setConfirmOpen(null)}
          title={
            confirmOpen === "publish"
              ? e.published
                ? "Сурагчдаас нуух уу?"
                : "Сурагчдад нээх үү?"
              : e.studentDetail
                ? "Дэлгэрэнгүйг нуух уу?"
                : "Дэлгэрэнгүйг сурагчдад нээх үү?"
          }
          description={
            confirmOpen === "publish"
              ? e.published
                ? "Сурагчид энэ шалгалтын дүнгээ харахаа болино"
                : e.studentDetail
                  ? "Шалгалт өгсөн бүх сурагч оноо, бодлого бүрийн зөв, буруу, бодлогын тайлбар, материал, дүнгийн жагсаалтаа харна"
                  : "Шалгалт өгсөн бүх сурагч өөрийн оноо, бодлого бүрийн зөв, буруугаа л харна. Бодлогын тайлбар, материал, жагсаалт «Тун удахгүй» хэвээр"
              : e.studentDetail
                ? "Сурагчид дахин зөвхөн оноо, бодлого бүрийн зөв, буруугаа харна"
                : `Бодлогын тайлбар, бодолт, материал (PDF), задаргаа, дүнгийн жагсаалт бүх сурагчид нээгдэнэ${e.published ? "" : ". Шалгалт сурагчдад нээгээгүй тул «Сурагчдад нээх»-ийн дараа харагдана"}`
          }
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmOpen(null)}>
                Болих
              </Button>
              <Button
                disabled={busy}
                onClick={async () => {
                  const which = confirmOpen;
                  setConfirmOpen(null);
                  await (which === "publish" ? togglePublish() : toggleDetail());
                }}
              >
                {confirmOpen === "publish"
                  ? e.published
                    ? "Нуух"
                    : "Тийм, нээх"
                  : e.studentDetail
                    ? "Нуух"
                    : "Тийм, нээх"}
              </Button>
            </>
          }
        >
          <span />
        </ExamDialog>
      )}

      <ExamDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Шалгалтыг устгах уу?"
        description="Жагсаалтаас хасагдаж, сурагчдад харагдахаа болино."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Болих
            </Button>
            <Button variant="danger" disabled={busy} onClick={remove}>
              Устгах
            </Button>
          </>
        }
      >
        <span />
      </ExamDialog>
    </div>
  );
}

/** Ажилтанд материалын хувилбар сонгогч + харагч */
function StaffMaterial({ examId, title, variants }: { examId: string; title: string; variants: string[] }) {
  const [variant, setVariant] = useState(variants[0]);
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {variants.length > 1 && (
        <div className="flex gap-2" role="group" aria-label="Хувилбар">
          {variants.map((v) => (
            <button
              key={v}
              aria-pressed={variant === v}
              onClick={() => setVariant(v)}
              className={
                variant === v
                  ? "min-h-11 min-w-14 rounded-xl border-2 border-brand-bright bg-brand-bright/15 px-4 font-bold text-brand-soft"
                  : "min-h-11 min-w-14 rounded-xl border-2 border-line px-4 font-bold text-ink-dim"
              }
            >
              {v}
            </button>
          ))}
        </div>
      )}
      <MaterialViewer key={variant} examId={examId} title={title} variant={variant} staff variantCount={variants.length} />
    </div>
  );
}

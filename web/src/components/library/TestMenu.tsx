"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useRef, useState, type ComponentType } from "react";
import { BarChart3, BookOpen, Clock, MoreHorizontal, PencilLine, RotateCw, Sigma, Users } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Meta, MetaTitle } from "@/components/ui/Meta";
import { SkeletonLine } from "@/components/ui/Skeleton";
import ClassesDialog from "./test-menu/ClassesDialog";
import FormulaDialog from "./test-menu/FormulaDialog";
import RenameDialog from "./test-menu/RenameDialog";
import StatsDialog from "./test-menu/StatsDialog";
import TheoryDialog from "./test-menu/TheoryDialog";
import TimeLimitDialog from "./test-menu/TimeLimitDialog";
import {
  errorMessage,
  openClassCount,
  sortVariants,
  timeSummary,
  type MenuAction,
  type MenuTest,
} from "./test-menu/shared";

const itemClass =
  "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm font-semibold text-ink outline-none data-[highlighted]:bg-ink/5 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45";

/**
 * Бодлогын сангийн тестийн «⋯» цэс (зөвхөн ажилтан). Нэг «тест» = нэг бүлэг,
 * дотроо A/B хувилбар — үйлдэл бүр хоёуланд нь хамт.
 *
 * Цэс нээгдэхэд л GET /tests?chapterId= (≈1.5 КБ) — толгойд нэр, хугацаа,
 * нээлттэй ангийн тоо. Үйлдлийн цонх бүр өөрийн өгөгдлийг нээгдэхдээ ачаална.
 */
export default function TestMenu({
  chapterId,
  chapterTitle,
  canEdit,
  canEditContent,
  topicSize = 1,
  compact = false,
  onRenamed,
  onChanged,
}: {
  chapterId: string;
  chapterTitle: string;
  /** Ажилтан (ADMIN/TEACHER/TEACHER_PLUS) — цэс харагдана */
  canEdit: boolean;
  /** Агуулга засах (ADMIN/TEACHER_PLUS) — нэр, онол, томьёо */
  canEditContent: boolean;
  /** Энэ сэдэвт хэдэн тест (бүлэг) бий — нэр солиход анхааруулна */
  topicSize?: number;
  /** Сэдвийн толгойн сумтай ижил 40px товч (эс бөгөөс картын 44px) */
  compact?: boolean;
  onRenamed?: (title: string) => void;
  /** Онол/томьёо хадгалагдсан — хуудас «N онол» тоогоо шинэчилнэ */
  onChanged?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [tests, setTests] = useState<MenuTest[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [action, setAction] = useState<MenuAction | null>(null);
  const stale = useRef(true);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const requestRef = useRef(0);

  async function load() {
    const id = ++requestRef.current;
    setLoading(true);
    setError("");
    try {
      const rows = await api<MenuTest[]>(`/tests?chapterId=${encodeURIComponent(chapterId)}`);
      if (id !== requestRef.current) return;
      setTests(sortVariants(rows));
      stale.current = false;
    } catch (e) {
      if (id === requestRef.current) setError(errorMessage(e, "Тестийн мэдээллийг ачаалж чадсангүй"));
    } finally {
      if (id === requestRef.current) setLoading(false);
    }
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    // Цэс нээгдэхэд л ачаална; өөрчлөлтийн дараа дахин нээхэд шинээр
    if (next && (stale.current || !tests) && !loading) void load();
  }

  function close() {
    setAction(null);
    // Цонх хаагдсаны дараа фокус «⋯» товч руу (дэлгэц уншигч, гарын хэрэглэгч)
    window.setTimeout(() => {
      if (!document.activeElement || document.activeElement === document.body) triggerRef.current?.focus();
    }, 50);
  }

  // Хугацаа/анги — зөвхөн цэсийн толгойг дараагийн нээлтэд шинэчилнэ
  function changed() {
    stale.current = true;
  }

  // Онол/томьёо — хуудасны «N онол» тоо өөрчлөгдөнө
  function contentChanged() {
    stale.current = true;
    onChanged?.();
  }

  if (!canEdit) return null;

  const list = tests ?? [];
  const hasTests = list.length > 0;
  const time = timeSummary(list);
  const classes = openClassCount(list);
  const items: { key: MenuAction; label: string; icon: ComponentType<{ className?: string }>; hint?: string | null; disabled?: boolean; show?: boolean }[] = [
    { key: "rename", label: "Нэр өөрчлөх", icon: PencilLine, show: canEditContent },
    { key: "time", label: "Хугацаа", icon: Clock, hint: time, disabled: !hasTests },
    { key: "theory", label: "Онол", icon: BookOpen },
    { key: "formulas", label: "Томьёо", icon: Sigma },
    { key: "stats", label: "Статистик", icon: BarChart3, disabled: !hasTests },
    { key: "classes", label: "Ангиуд", icon: Users, hint: hasTests ? String(classes) : null, disabled: !hasTests },
  ];

  return (
    <>
      <DropdownMenu.Root open={open} onOpenChange={onOpenChange} modal={false}>
        <DropdownMenu.Trigger asChild>
          <button
            ref={triggerRef}
            type="button"
            aria-label="Тестийн удирдлага"
            className={cn(
              "inline-flex shrink-0 items-center justify-center text-ink-dim transition hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand data-[state=open]:bg-ink/5 data-[state=open]:text-ink",
              compact ? "h-10 w-10 rounded-xl" : "h-11 w-11 rounded-xl",
            )}
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            collisionPadding={12}
            className="elev-2 z-[65] w-[min(18rem,calc(100vw-1.5rem))] rounded-xl border border-line bg-surface p-1"
          >
            {/* Толгой: нэр, хугацаа, нээлттэй анги */}
            <div className="border-b border-line px-3 pb-2 pt-1.5">
              <DropdownMenu.Label className="line-clamp-2 text-sm font-bold text-ink">
                <MetaTitle>{chapterTitle}</MetaTitle>
              </DropdownMenu.Label>
              {loading && !tests ? (
                <div className="mt-1.5 space-y-1" aria-hidden>
                  <SkeletonLine width="70%" height={10} />
                </div>
              ) : error ? (
                <p role="alert" className="mt-0.5 text-xs text-error">
                  {error}
                </p>
              ) : tests && !hasTests ? (
                <p className="mt-0.5 text-xs text-ink-dim">Энэ сэдэвт тест хараахан алга</p>
              ) : tests ? (
                <Meta
                  className="mt-0.5 text-xs text-ink-dim"
                  items={[
                    time,
                    classes > 0 ? `${classes} ангид нээлттэй` : "Ангид нээгээгүй",
                    list.length > 1 ? `${list.map((t) => t.variantLabel).filter(Boolean).join(", ")} хувилбар` : null,
                  ]}
                />
              ) : null}
            </div>

            <div className="pt-1">
              {error && (
                <DropdownMenu.Item
                  className={itemClass}
                  onSelect={(e) => {
                    // Цэс нээлттэй хэвээр дахин ачаална
                    e.preventDefault();
                    void load();
                  }}
                >
                  <RotateCw className="h-4 w-4 shrink-0 text-ink-dim" aria-hidden />
                  <span className="flex-1">Дахин оролдох</span>
                </DropdownMenu.Item>
              )}
              {items
                .filter((i) => i.show !== false)
                .map(({ key, label, icon: Icon, hint, disabled }) => (
                  <DropdownMenu.Item
                    key={key}
                    className={itemClass}
                    disabled={disabled || (loading && !tests)}
                    onSelect={() => setAction(key)}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-ink-dim" aria-hidden />
                    <span className="flex-1">{label}</span>
                    {hint && <span className="text-xs font-normal tabular-nums text-ink-dim">{hint}</span>}
                  </DropdownMenu.Item>
                ))}
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {action === "rename" && (
        <RenameDialog
          chapterId={chapterId}
          chapterTitle={chapterTitle}
          topicSize={topicSize}
          onClose={close}
          onRenamed={(title) => {
            stale.current = true;
            onRenamed?.(title);
          }}
        />
      )}
      {action === "time" && hasTests && <TimeLimitDialog tests={list} onSaved={changed} onClose={close} />}
      {action === "theory" && (
        <TheoryDialog chapterId={chapterId} canEditContent={canEditContent} onSaved={contentChanged} onClose={close} />
      )}
      {action === "formulas" && (
        <FormulaDialog chapterId={chapterId} canEditContent={canEditContent} onSaved={contentChanged} onClose={close} />
      )}
      {action === "stats" && hasTests && (
        <StatsDialog tests={list} onOpenClasses={() => setAction("classes")} onClose={close} />
      )}
      {action === "classes" && hasTests && <ClassesDialog tests={list} onChanged={changed} onClose={close} />}
    </>
  );
}

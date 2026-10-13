"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { Copy, History, List, MoreHorizontal, Save } from "lucide-react";
import UndoRedoButtons from "@/components/history/UndoRedoButtons";
import PresenceBadge from "@/components/presence/PresenceBadge";
import { Button } from "@/components/ui/kit/button";
import { Meta, MetaTitle } from "@/components/ui/Meta";
import type { PresenceEditor } from "@/hooks/usePresence";
import { cn } from "@/lib/cn";

const menuItem =
  "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink outline-none data-[highlighted]:bg-ink/5";

export interface NavChip {
  key: string;
  changed: boolean;
  error: boolean;
}

/**
 * Үргэлж дээр харагдах мөр (апп-ийн толгойн доор, top-14): ↶ ↷, Хадгалах, Түүх,
 * ⋯ ба бодлогын дугаарын жагсаалт — аль ч бодлого руу шууд үсэрнэ (дээш доош
 * гүйлгэж хайхгүй). Өөрчилсөн бодлого цэгтэй, алдаатай нь улаан.
 */
export default function EditorToolbar({
  title,
  stats,
  timeLimit,
  editors,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  dirtyCount,
  saving,
  onSave,
  onHistory,
  onDuplicate,
  duplicating,
  chips,
  activeKey,
  onJump,
}: {
  title: string;
  stats: { choice: number; fill: number; open: number; points: number };
  timeLimit: number | null;
  editors?: PresenceEditor[];
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** Хадгалаагүй өөрчлөлтийн тоо (0 — «Хадгалах» идэвхгүй) */
  dirtyCount: number;
  saving: boolean;
  onSave: () => void;
  onHistory: () => void;
  onDuplicate: () => void;
  duplicating: boolean;
  chips: NavChip[];
  activeKey: string | null;
  onJump: (key: string) => void;
}) {
  return (
    <div className="sticky top-14 z-20 chunky space-y-2 p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-extrabold text-ink">
            <MetaTitle>{title || "Нэргүй тест"}</MetaTitle>
          </p>
          <Meta
            className="text-sm text-ink-dim"
            items={[
              `${stats.choice} сонгох`,
              stats.fill > 0 && `${stats.fill} нөхөх`,
              stats.open > 0 && `${stats.open} задгай`,
              `нийт ${stats.points} оноо`,
              timeLimit ? `${timeLimit} минут` : null,
            ]}
          />
        </div>
        <PresenceBadge editors={editors} />
        <UndoRedoButtons canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo} />
        <Button type="button" onClick={onSave} disabled={dirtyCount === 0 || saving} aria-busy={saving}>
          <Save aria-hidden />
          {saving ? "Хадгалж байна" : dirtyCount > 0 ? `Хадгалах (${dirtyCount})` : "Хадгалсан"}
        </Button>
        <Button type="button" variant="outline" onClick={onHistory} aria-label="Өөрчлөлтийн түүх">
          <History aria-hidden /> <span className="hidden md:inline">Түүх</span>
        </Button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button type="button" variant="ghost" size="icon" aria-label="Бусад үйлдэл">
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="elev-3 z-[60] min-w-56 rounded-2xl border border-line bg-surface p-1.5"
            >
              <DropdownMenu.Item className={menuItem} disabled={duplicating} onSelect={onDuplicate}>
                <Copy className="h-4 w-4" aria-hidden /> {duplicating ? "Хуулж байна" : "Тест хуулах"}
              </DropdownMenu.Item>
              <DropdownMenu.Item className={menuItem} asChild>
                <Link href="/app/tests">
                  <List className="h-4 w-4" aria-hidden /> Жагсаалт руу буцах
                </Link>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {chips.length > 0 && (
        <nav
          aria-label="Бодлого руу очих"
          // inline-size containment: 40 товчны өргөн хуудсыг хажуу тийш тэлэхгүй (зөвхөн энэ мөр гүйлгэнэ)
          className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [contain:inline-size]"
        >
          {chips.map((chip, i) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => onJump(chip.key)}
              aria-current={chip.key === activeKey ? "true" : undefined}
              aria-label={`${i + 1}-р бодлого руу очих${chip.changed ? " (засварласан)" : ""}${chip.error ? " (алдаатай)" : ""}`}
              className={cn(
                "relative flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border px-1.5 text-sm font-bold transition",
                chip.key === activeKey
                  ? "border-brand-bright bg-brand-bright text-on-brand"
                  : chip.error
                    ? "border-error/60 bg-error/10 text-error"
                    : "border-line bg-bg text-ink-dim hover:border-brand-bright/60 hover:text-ink",
              )}
            >
              {i + 1}
              {chip.changed && chip.key !== activeKey && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-info" aria-hidden />
              )}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

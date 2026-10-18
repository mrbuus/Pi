"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Info, Lock } from "lucide-react";
import { toast } from "sonner";
import TheoryBlockEditor from "@/components/theory/TheoryBlockEditor";
import TheoryContent from "@/components/theory/TheoryContent";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { Button } from "@/components/ui/kit/button";
import { confirmDiscardUnsaved } from "@/lib/unsavedChanges";
import ActionDialog from "./ActionDialog";
import { isFormulaBlock, useChapterTheories } from "./shared";

/**
 * «Онол»: тестийн (бүлгийн) ганц онолын хэсэг — «Томьёо» блокоос бусад
 * эхний TheoryBlock. Байвал засна (PATCH /lessons/theory/:id), байхгүй бол
 * үүсгэнэ (POST /lessons/:chapterId/theory). Засварлагч нь /admin/theory-ийн
 * TheoryBlockEditor (зураг байршуулах, сурагчид харагдах урьдчилсан харагдац).
 * Багш+/Админ засна; энгийн багш уншиж харна.
 */
export default function TheoryDialog({
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
  const theories = (rows ?? []).filter((t) => !isFormulaBlock(t));
  const block = theories[0] ?? null;

  return (
    <ActionDialog
      title="Онол"
      description="Тестийн өмнө сурагчид унших онолын хэсэг"
      wide
      dirty={dirty}
      onClose={onClose}
      footer={
        !canEditContent || error ? (
          <Button type="button" variant="ghost" onClick={onClose}>
            Хаах
          </Button>
        ) : undefined
      }
    >
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !rows ? (
        <LoadingState rows={6} label="Онолыг ачаалж байна" />
      ) : canEditContent ? (
        <div className="space-y-3">
          {theories.length > 1 && (
            <p className="flex items-start gap-2 rounded-xl border border-line bg-panel px-3 py-2 text-sm text-ink-dim">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                Энэ сэдэвт {theories.length} онолын хэсэг байна — эхнийхийг засаж байна. Бусдыг{" "}
                <Link href="/app/admin/theory" className="font-semibold text-brand underline-offset-4 hover:underline">
                  Онолын агуулга
                </Link>{" "}
                хуудаснаас засна
              </span>
            </p>
          )}
          <TheoryBlockEditor
            key={block?.id ?? "new"}
            chapterId={chapterId}
            block={block ? { ...block, chapterId } : null}
            onDirtyChange={setDirty}
            onCancel={() => {
              if (dirty && !confirmDiscardUnsaved()) return;
              onClose();
            }}
            onSaved={() => {
              toast.success(block ? "Онол хадгалагдлаа" : "Онол нэмэгдлээ");
              onSaved();
              onClose();
            }}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <p className="flex items-start gap-2 text-sm text-ink-dim">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Онолыг Багш+ эсвэл админ засна
          </p>
          {block ? (
            <article className="rounded-xl border border-line bg-panel p-4">
              <h3 className="mb-2 text-base font-bold text-ink">{block.title}</h3>
              <TheoryContent markdown={block.content} />
            </article>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="Онол хараахан нэмэгдээгүй"
              hint="Багш+ эсвэл админ энэ тестэд онол нэмэхэд энд харагдана"
            />
          )}
        </div>
      )}
    </ActionDialog>
  );
}

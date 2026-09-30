"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { BookOpen } from "lucide-react";
import { getRole } from "@/lib/api";
import { Meta } from "@/components/ui/Meta";
import {
  LoadingState,
  EmptyState,
  ErrorState,
} from "@/components/ui/StateBlock";
import { Button } from "@/components/ui/kit/button";
import { Progress } from "@/components/ui/kit/progress";
import { FormulaCard } from "./FormulaCard";
import { MasteryBadge } from "./MasteryBadge";
import { dateGroup } from "./dateGroups";
import { useFormulaRequest } from "./useFormulaRequest";
import type { SeenFormulas, FormulaSummary } from "./types";
const subscribe = () => () => {};
export function SeenFormulaList({
  studentId,
  query,
  level,
  grade,
  catalog,
}: {
  studentId: string;
  query: string;
  level: string;
  grade: string;
  catalog: FormulaSummary[];
}) {
  const role = useSyncExternalStore(subscribe, getRole, () => null);
  const needsStudent = (role === "PARENT" || role === "TEACHER") && !studentId;
  const path =
    !role || needsStudent
      ? null
      : `/formulas/my${studentId && !["STUDENT", "BUYER"].includes(role) ? `?studentId=${encodeURIComponent(studentId)}` : ""}`;
  const result = useFormulaRequest<SeenFormulas>(path);
  const [now] = useState(() => new Date());
  if (!role) return <LoadingState />;
  if (needsStudent)
    return (
      <EmptyState
        icon={BookOpen}
        title="Сурагчаа сонгоод туулсан томьёог нь хараарай"
        hint={
          role === "PARENT"
            ? "Баталгаажсан хүүхдийнхээ холбоосоор нээнэ."
            : "Өөрийн ангийн сурагчийн холбоосоор нээнэ."
        }
        action={
          <Button asChild variant="outline">
            <Link href={role === "PARENT" ? "/app/parent" : "/app/teacher"}>
              Самбар руу очих
            </Link>
          </Button>
        }
      />
    );
  if (result.loading)
    return <LoadingState label="Туулсан томьёог ачаалж байна" />;
  if (result.error)
    return <ErrorState message={result.error} onRetry={result.retry} />;
  if (!result.data) return null;
  const { items, totalFormulas, seenFormulas } = result.data;
  const bySlug = new Map(catalog.map((f) => [f.slug, f]));
  const filtered = items.filter((f) => {
    const detail = bySlug.get(f.slug);
    return (
      (!level || detail?.level === level) &&
      (!grade || detail?.grade === Number(grade)) &&
      `${f.title} ${f.slug} ${f.section?.title ?? ""} ${f.general ?? ""}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase().trim())
    );
  });
  let offset = 0;
  return (
    <div className="space-y-6">
      <div className="chunky space-y-3 bg-panel p-5">
        <p className="font-bold">
          Тестүүддээ {seenFormulas}/{totalFormulas} томьёотой таарсан
        </p>
        <Progress
          value={totalFormulas > 0 ? (seenFormulas / totalFormulas) * 100 : 0}
          aria-label="Туулсан томьёоны явц"
        />
      </div>
      {!items.length ? (
        <EmptyState
          icon={BookOpen}
          title="Тест өгөх тусам энд томьёо нэмэгдэнэ"
          action={
            <Button asChild>
              <Link href="/app/tests">Тестүүд харах</Link>
            </Button>
          }
        />
      ) : !filtered.length ? (
        <EmptyState
          title="Шүүлтүүрт тохирох туулсан томьёо алга"
          hint="Хайлт эсвэл шүүлтүүрээ өөрчлөөд үзээрэй."
        />
      ) : (
        (
          [
            ["today", "Өнөөдөр"],
            ["week", "Энэ долоо хоног"],
            ["earlier", "Өмнө"],
          ] as const
        ).map(([key, title]) => {
          const group = filtered
            .filter((f) => dateGroup(f.firstSeenAt, now) === key)
            .sort((a, b) =>
              (a.firstSeenAt ?? "").localeCompare(b.firstSeenAt ?? ""),
            );
          const start = offset;
          offset += group.length;
          return (
            group.length > 0 && (
              <section key={key} className="space-y-3">
                <h2 className="text-lg font-bold">{title}</h2>
                <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {group.map((f, index) => (
                    <FormulaCard
                      key={f.slug}
                      formula={f}
                      deferred={start + index >= 30}
                    >
                      <MasteryBadge
                        correctCount={f.correctCount}
                        seenCount={f.seenCount}
                      />
                      <div className="mt-2 text-sm text-ink-dim">
                        <Meta
                          items={[
                            f.section?.title,
                            f.lastTestTitle
                              ? `Сүүлд: ${f.lastTestTitle}`
                              : "Тестийн нэр бүртгэгдээгүй",
                          ]}
                        />
                      </div>
                    </FormulaCard>
                  ))}
                </div>
              </section>
            )
          );
        })
      )}
    </div>
  );
}

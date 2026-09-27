"use client";
import Link from "next/link";
import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, Brain, Printer } from "lucide-react";
import { Button } from "@/components/ui/kit/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/kit/tabs";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateBlock";
import { FormulaSearch } from "@/components/formulas/FormulaSearch";
import { SectionBlock } from "@/components/formulas/SectionBlock";
import { SeenFormulaList } from "@/components/formulas/SeenFormulaList";
import { useFormulaRequest } from "@/components/formulas/useFormulaRequest";
import type {
  FormulaSection,
  FormulaSummary,
} from "@/components/formulas/types";
export default function FormulasClient() {
  const params = useSearchParams();
  const studentId = params.get("studentId") ?? "";
  const view =
    (params.get("view") ?? (studentId ? "my" : "all")) === "my" ? "my" : "all";
  const query = params.get("q") ?? "",
    level = ["CORE", "EXTRA"].includes(params.get("level") ?? "")
      ? params.get("level")!
      : "",
    grade = /^(7|8|9|10|11|12)$/.test(params.get("grade") ?? "")
      ? params.get("grade")!
      : "";
  const catalog = useFormulaRequest<FormulaSummary[]>("/formulas");
  const sections = useFormulaRequest<FormulaSection[]>("/formulas/sections");
  const change = useCallback((name: string, value: string) => {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set(name, value);
    else url.searchParams.delete(name);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, []);
  const formulas = catalog.data ?? [];
  const ordered = [...(sections.data ?? [])].sort((a, b) => a.order - b.order);
  const known = new Set(ordered.map((s) => s.slug));
  if (formulas.some((f) => !f.section || !known.has(f.section)))
    ordered.push({
      slug: "unfiled",
      title: "Бусад томьёо",
      order: 99,
      icon: "sigma",
      description: null,
      count: 0,
    });
  const matches = formulas.filter(
    (f) =>
      (!level || f.level === level) &&
      (!grade || f.grade === Number(grade)) &&
      `${f.title} ${f.slug} ${f.topicSlugs.join(" ")} ${f.general ?? ""} ${ordered.find((s) => s.slug === f.section)?.title ?? ""}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase().trim()),
  );
  let offset = 0;
  return (
    <div className="min-w-0 space-y-6 pb-6 [&_button]:min-h-11">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Томьёоны сан</h1>
          <p className="mt-2 text-sm text-ink-dim">
            {catalog.data && sections.data
              ? `${formulas.length} томьёо, ${ordered.length} бүлэг`
              : "Ойлгоод, хэрэглээд, тогтоогоорой"}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/app/formulas/print">
            <Printer aria-hidden />
            Хэвлэх хуудас
          </Link>
        </Button>
      </div>
      <FormulaSearch
        query={query}
        level={level}
        grade={grade}
        onChange={change}
      />
      <Tabs value={view} onValueChange={(value) => change("view", value)}>
        <div className="mb-5 flex min-w-0 flex-wrap items-center gap-2">
          <TabsList
            aria-label="Томьёоны харагдац"
            className="!mx-0 min-w-0 !px-0"
          >
            <TabsTrigger value="all">
              <BookOpen aria-hidden />
              Бүх томьёо
            </TabsTrigger>
            <TabsTrigger value="my">Миний туулсан</TabsTrigger>
          </TabsList>
          <Button asChild variant="ghost" className="min-h-11">
            <Link href="/app/formulas/review" prefetch={false}>
              <Brain aria-hidden />
              Цээжлэх
            </Link>
          </Button>
        </div>
        {catalog.loading || sections.loading ? (
          <LoadingState label="Томьёоны санг ачаалж байна" />
        ) : catalog.error || sections.error ? (
          <ErrorState
            message="Томьёоны санг ачаалж чадсангүй."
            onRetry={() => {
              if (catalog.error) catalog.retry();
              if (sections.error) sections.retry();
            }}
          />
        ) : (
          <>
            <TabsContent value="all" className="space-y-5">
              <p className="text-sm text-ink-dim" role="status">
                {matches.length} томьёо
              </p>
              {!formulas.length ? (
                <EmptyState
                  icon={BookOpen}
                  title="Томьёоны сан хараахан нэмэгдээгүй байна"
                  hint="Шинэ томьёо нэмэгдэхэд энд бүлгээрээ харагдана."
                />
              ) : !matches.length ? (
                <EmptyState
                  title="Хайлтанд тохирох томьёо олдсонгүй"
                  action={
                    <Button
                      variant="outline"
                      onClick={() => {
                        const url = new URL(window.location.href);
                        ["q", "level", "grade"].forEach((k) =>
                          url.searchParams.delete(k),
                        );
                        window.history.replaceState(
                          null,
                          "",
                          `${url.pathname}${url.search}`,
                        );
                      }}
                    >
                      Шүүлтүүр арилгах
                    </Button>
                  }
                />
              ) : (
                ordered.map((section, index) => {
                  const items = matches
                    .filter((f) =>
                      section.slug === "unfiled"
                        ? !f.section || !known.has(f.section)
                        : f.section === section.slug,
                    )
                    .sort((a, b) => a.order - b.order);
                  const start = offset;
                  offset += items.length;
                  return (
                    items.length > 0 && (
                      <SectionBlock
                        key={section.slug}
                        section={section}
                        formulas={items}
                        index={index}
                        offset={start}
                      />
                    )
                  );
                })
              )}
            </TabsContent>
            <TabsContent value="my">
              <SeenFormulaList
                key={studentId}
                studentId={studentId}
                query={query}
                level={level}
                grade={grade}
                catalog={formulas}
              />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

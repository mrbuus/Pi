"use client";
import { useEffect, useState, Suspense } from "react";
import { Shapes } from "lucide-react";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/kit/card";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/ui/StateBlock";
import { FORMULA_WIDGETS, WIDGET_TITLES } from "@/components/formulas/widgets";
export default function WidgetGallery() {
  const [selected, select] = useState("quadratic-graph"),
    [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    key: number;
    role?: string;
    failed?: boolean;
  } | null>(null);
  useEffect(() => {
    let live = true;
    api<{ role: string }>("/auth/me")
      .then((user) => {
        if (live) setResult({ key: retry, role: user.role });
      })
      .catch(() => {
        if (live) setResult({ key: retry, failed: true });
      });
    return () => {
      live = false;
    };
  }, [retry]);
  const Widget = FORMULA_WIDGETS[selected];
  return (
    <section className="mx-auto w-full min-w-0 max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <header className="space-y-2">
        <Shapes className="h-8 w-8 text-brand" aria-hidden />
        <h1 className="text-2xl font-bold">Томьёог хөдөлгөж ойлгоё</h1>
        <p className="text-sm text-ink-dim">
          Гулсуурыг чирэх эсвэл гарын сумтай товчоор утгыг өөрчилнө. Үр дүн,
          зураг зэрэг шинэчлэгдэнэ.
        </p>
      </header>
      {result?.key !== retry ? (
        <LoadingState label="Эрхийг шалгаж байна" />
      ) : result.failed ? (
        <div className="[&_button]:min-h-11">
          <ErrorState
            message="Таны эрхийг шалгаж чадсангүй."
            onRetry={() => setRetry((n) => n + 1)}
          />
        </div>
      ) : !["ADMIN", "TEACHER_PLUS"].includes(result.role ?? "") ? (
        <EmptyState
          title="Энэ үзүүлэн багшийн эрхтэй хэрэглэгчид нээлттэй"
          hint="Админ эсвэл Багш+ эрхээр үзүүлэнг хянана. Сурагчид томьёоны тайлбар дотроос тухайн зургийг ашиглана."
        />
      ) : (
        <>
          <div className="space-y-2">
            <label htmlFor="widget-picker" className="text-sm font-semibold">
              Интерактив зураг сонгох
            </label>
            <select
              id="widget-picker"
              className="min-h-11 w-full rounded-xl border-2 border-line bg-surface px-3 text-ink focus-visible:outline-brand"
              value={selected}
              onChange={(e) => select(e.target.value)}
            >
              {Object.entries(WIDGET_TITLES).map(([slug, label]) => (
                <option key={slug} value={slug}>
                  {label}
                </option>
              ))}
            </select>
            <p className="text-xs text-ink-dim">
              Нэг удаад сонгосон зураг ажиллана. Графикийн харагдах цонх
              хязгаартай; тооцоолсон утгыг хоёр орны нарийвчлалд тоймлон доор
              харуулна.
            </p>
          </div>
          <Card data-widget={selected}>
            <CardHeader>
              <CardTitle>{WIDGET_TITLES[selected]}</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense
                fallback={
                  <LoadingState rows={3} label="Зургийг бэлтгэж байна" />
                }
              >
                {Widget ? (
                  <Widget key={selected} />
                ) : (
                  <EmptyState
                    title="Зураг олдсонгүй"
                    hint="Жагсаалтаас өөр зураг сонгоно уу."
                  />
                )}
              </Suspense>
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}

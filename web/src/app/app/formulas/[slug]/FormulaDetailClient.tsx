"use client";
import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  Copy,
  Printer,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { getRole } from "@/lib/api";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/kit/card";
import {
  LoadingState,
  EmptyState,
  ErrorState,
} from "@/components/ui/StateBlock";
import { FormulaMath } from "@/components/formulas/FormulaMath";
import { PrintMath } from "@/components/formulas/PrintMath";
import { StepReveal } from "@/components/formulas/StepReveal";
import { FORMULA_WIDGETS } from "@/components/formulas/widgets";
import { useFormulaRequest } from "@/components/formulas/useFormulaRequest";
import type { FormulaDetail } from "@/components/formulas/types";
import styles from "@/components/formulas/Print.module.css";
const subscribe = () => () => {};
function DetailBlock({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
function DisplayFormula({ text }: { text: string }) {
  return (
    <>
      <div className="print:hidden">
        <FormulaMath text={text} display />
      </div>
      <div className="hidden print:block">
        <PrintMath latex={text} />
      </div>
    </>
  );
}
export default function FormulaDetailClient({ slug }: { slug: string }) {
  const result = useFormulaRequest<FormulaDetail>(
    `/formulas/${encodeURIComponent(slug)}`,
  );
  const role = useSyncExternalStore(subscribe, getRole, () => null);
  const back = (
    <Button asChild variant="ghost">
      <Link href="/app/formulas">
        <ArrowLeft aria-hidden />
        Томьёоны сан
      </Link>
    </Button>
  );
  if (result.loading) return <LoadingState label="Томьёог ачаалж байна" />;
  if (result.status === 404)
    return (
      <div className="space-y-4">
        {back}
        <EmptyState
          icon={BookOpen}
          title="Томьёо олдсонгүй"
          hint="Холбоос өөрчлөгдсөн байж болно. Санд буцаж хайгаарай."
        />
      </div>
    );
  if (result.error)
    return (
      <div className="space-y-4 [&_button]:min-h-11">
        {back}
        <ErrorState message={result.error} onRetry={result.retry} />
      </div>
    );
  if (!result.data) return null;
  const f = result.data;
  const Widget =
    f.widget && Object.hasOwn(FORMULA_WIDGETS, f.widget)
      ? FORMULA_WIDGETS[f.widget]
      : undefined;
  async function copy() {
    try {
      await navigator.clipboard.writeText(f.latex ?? f.general ?? "");
      toast.success("LaTeX хууллаа");
    } catch {
      toast.error("Хуулж чадсангүй. Хөтчийн хуулбарлах зөвшөөрлийг шалгаарай.");
    }
  }
  return (
    <article
      className={`${styles.printRoot} min-w-0 space-y-5 pb-6 [&_button]:min-h-11`}
    >
      <div className="flex flex-wrap justify-between gap-2 print:hidden">
        {back}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={copy}
            disabled={!f.latex && !f.general}
          >
            <Copy aria-hidden />
            Хуулах
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer aria-hidden />
            Хэвлэх
          </Button>
        </div>
      </div>
      <Card className="border-brand-bright/30 bg-brand-bright/10">
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2">
            {f.section && <Badge tone="brand">{f.section.title}</Badge>}
            <Badge>{f.level === "CORE" ? "ЭЕШ-ийн гол" : "Нэмэлт"}</Badge>
            {f.grade && <Badge>{f.grade}-р анги</Badge>}
          </div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{f.title}</h1>
          <div className="mt-4 text-lg">
            <DisplayFormula text={f.latex ?? f.general ?? ""} />
          </div>
        </CardContent>
      </Card>
      <DetailBlock title="Ерөнхий хэлбэр">
        <DisplayFormula text={f.general ?? f.latex ?? ""} />
        {(f.variants ?? []).map((v, i) => (
          <div key={i} className="mt-4 border-t border-line pt-4">
            <h3 className="font-semibold">{v.label}</h3>
            <DisplayFormula text={v.latex} />
          </div>
        ))}
      </DetailBlock>
      {!!f.conditions?.length && (
        <section className="rounded-2xl border border-warning/40 bg-warning/10 p-5">
          <h2 className="mb-2 flex items-center gap-2 font-bold">
            <TriangleAlert className="size-5 shrink-0" aria-hidden />
            Хэрэглэх нөхцөл
          </h2>
          <ul>
            {f.conditions.map((c, i) => (
              <li key={i}>
                <DisplayFormula text={c} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <DetailBlock title="Энгийнээр">
        {f.explanation ? (
          <FormulaMath text={f.explanation} />
        ) : (
          <p className="text-ink-dim">Тайлбар хараахан нэмэгдээгүй байна.</p>
        )}
      </DetailBlock>
      {!!f.derivation?.length && (
        <DetailBlock title="Яагаад ийм болдог вэ">
          <StepReveal steps={f.derivation} />
        </DetailBlock>
      )}
      {f.mnemonic && (
        <DetailBlock
          title={
            <span className="flex items-center gap-2">
              <Brain className="size-5" aria-hidden />
              Цээжлэх арга
            </span>
          }
        >
          <FormulaMath text={f.mnemonic} />
        </DetailBlock>
      )}
      {Widget && (
        <Card>
          <CardContent>
            <Widget />
          </CardContent>
        </Card>
      )}
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Жишээ</h2>
        {f.examples?.length ? (
          f.examples.map((example, i) => (
            <Card key={i}>
              <CardContent>
                <h3 className="mb-2 font-bold">Жишээ {i + 1}</h3>
                <FormulaMath text={example.problem} />
                <p className="mb-4 mt-3 text-sm font-medium text-brand-soft">
                  Эхлээд өөрөө бодоод үз
                </p>
                <StepReveal steps={example.steps} answer={example.answer} />
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState title="Жишээ хараахан нэмэгдээгүй байна" />
        )}
      </section>
      {!!f.commonMistakes?.length && (
        <DetailBlock title="Түгээмэл алдаа">
          <ul className="space-y-3">
            {f.commonMistakes.map((text, i) => (
              <li key={i} className="flex gap-2">
                <TriangleAlert
                  className="mt-1 size-4 shrink-0 text-warning"
                  aria-hidden
                />
                <div className="min-w-0">
                  <FormulaMath text={text} />
                </div>
              </li>
            ))}
          </ul>
        </DetailBlock>
      )}
      {f.eeshTip && (
        <DetailBlock title="ЭЕШ-д">
          <FormulaMath text={f.eeshTip} />
        </DetailBlock>
      )}
      {!!f.related.length && (
        <DetailBlock title="Холбоотой томьёо">
          <div className="flex flex-wrap gap-2">
            {f.related.map((related) => (
              <Button
                key={related.slug}
                asChild
                variant="outline"
                className="!whitespace-normal text-left"
              >
                <Link
                  href={`/app/formulas/${encodeURIComponent(related.slug)}`}
                  prefetch={false}
                >
                  {related.title}
                </Link>
              </Button>
            ))}
          </div>
        </DetailBlock>
      )}
      <DetailBlock title="Дасгал">
        {f.practice.length ? (
          <div className="space-y-4">
            {f.practice.map((problem) => (
              <section
                key={problem.problemId}
                className="min-w-0 rounded-xl border border-line p-4"
              >
                <h3 className="mb-2 text-sm font-semibold">
                  {problem.chapterTitle} — {problem.token}
                </h3>
                <FormulaMath
                  text={
                    problem.statementText ??
                    "Бодлогын нөхцөл хараахан нэмэгдээгүй байна."
                  }
                />
              </section>
            ))}
          </div>
        ) : (
          <EmptyState title="Холбоотой дасгал хараахан нэмэгдээгүй байна" />
        )}
        {role === "STUDENT" && (
          <Button asChild variant="outline" className="mt-4 print:hidden">
            <Link href="/app/practice">Ерөнхий дасгалын хуудас</Link>
          </Button>
        )}
      </DetailBlock>
    </article>
  );
}

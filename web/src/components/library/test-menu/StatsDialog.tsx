"use client";

import { useState } from "react";
import { ChevronLeft, Users } from "lucide-react";
import OverviewTab from "@/components/exams/OverviewTab";
import ProblemsTab from "@/components/exams/ProblemsTab";
import { useExamAnalytics } from "@/components/exams/analytics";
import { Button } from "@/components/ui/kit/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/kit/tabs";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import ActionDialog from "./ActionDialog";
import { variantName, type MenuTest } from "./shared";

/**
 * «Статистик»: A/B хувилбар тус бүрийн дүн — GET /exams/:testId/analytics.
 * «Шалгалт» хэсгийн Тойм (оролцогч, дундаж %, тархалт, анхаарах бодлого) ба
 * Бодлого (зүйл бүрийн задаргаа) табыг шууд дахин ашиглана.
 */
export default function StatsDialog({
  tests,
  onOpenClasses,
  onClose,
}: {
  tests: MenuTest[];
  /** «Ангид нээгээгүй» үед «Ангиуд» цонх руу шилжүүлнэ */
  onOpenClasses: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState(tests[0]?.id ?? "");

  return (
    <ActionDialog
      title="Статистик"
      description="Сурагчдын дүн хувилбар тус бүрээр"
      wide
      onClose={onClose}
      footer={
        <Button type="button" variant="ghost" onClick={onClose}>
          Хаах
        </Button>
      }
    >
      {tests.length === 1 ? (
        <VariantStats test={tests[0]} onOpenClasses={onOpenClasses} />
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList aria-label="Хувилбар сонгох" className="mx-0 px-0">
            {tests.map((t, i) => (
              <TabsTrigger key={t.id} value={t.id}>
                {variantName(t, i)}
              </TabsTrigger>
            ))}
          </TabsList>
          {tests.map((t) => (
            <TabsContent key={t.id} value={t.id} className="mt-4">
              {/* Зөвхөн нээлттэй таб ачаална (Radix идэвхгүй табыг mount хийхгүй) */}
              <VariantStats test={t} onOpenClasses={onOpenClasses} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </ActionDialog>
  );
}

function VariantStats({ test, onOpenClasses }: { test: MenuTest; onOpenClasses: () => void }) {
  const [classId, setClassId] = useState("all");
  const [view, setView] = useState<{ problems: boolean; focusKey: string | null }>({ problems: false, focusKey: null });
  const { data, error, retry } = useExamAnalytics(test.id, classId);

  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return <LoadingState rows={5} label="Статистик ачаалж байна" />;

  // «Бүгд» хүрээнд хоосон бол тайлбартай хоосон төлөв (Тойм табын «Тохиргоо таб»
  // гэсэн зааврын оронд энэ цонхны үйлдлийг санал болгоно)
  if (classId === "all" && data.summary.students === 0)
    return (
      <EmptyState
        icon={Users}
        title="Ангид нээгээгүй"
        hint="Тестийг ангид нээмэгц сурагчдын дүн энд харагдана"
        action={
          <Button type="button" variant="secondary" size="sm" onClick={onOpenClasses}>
            Ангиуд
          </Button>
        }
      />
    );
  if (classId === "all" && data.summary.taken === 0)
    return (
      <EmptyState
        icon={Users}
        title="Дүн хараахан ороогүй"
        hint={`${data.summary.students} сурагчид нээлттэй. Өгч дуусмагц оролцогч, дундаж, тархалт энд гарна`}
      />
    );

  if (view.problems)
    return (
      <div className="space-y-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => setView({ problems: false, focusKey: null })}>
          <ChevronLeft aria-hidden /> Тойм руу буцах
        </Button>
        <ProblemsTab testId={test.id} classId={classId} onClassChange={setClassId} focusKey={view.focusKey} />
      </div>
    );

  return (
    <div className="space-y-4">
      <OverviewTab
        testId={test.id}
        classId={classId}
        onClassChange={setClassId}
        onOpenItem={(key) => setView({ problems: true, focusKey: key })}
      />
      {data.items.length > 0 && (
        <Button type="button" variant="outline" size="sm" onClick={() => setView({ problems: true, focusKey: null })}>
          Бодлого бүрийн задаргаа
        </Button>
      )}
    </div>
  );
}

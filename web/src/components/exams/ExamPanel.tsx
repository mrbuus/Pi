"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/kit/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/kit/tabs";
import PresenceBadge from "@/components/presence/PresenceBadge";
import { usePresence } from "@/hooks/usePresence";
import { invalidateExamAnalytics } from "./analytics";
import GradesTab from "./GradesTab";
import MoreMenu from "./MoreMenu";
import OverviewTab from "./OverviewTab";
import ProblemsTab from "./ProblemsTab";
import SettingsTab from "./SettingsTab";
import StudentViewDialog from "./StudentViewDialog";
import type { ExamOverviewRow } from "./types";
import { confirmDiscardUnsaved } from "@/lib/unsavedChanges";

type TabKey = "overview" | "grades" | "problems" | "settings";

/**
 * Мөр дэлгэрэхэд: 4 таб (Тойм | Дүн | Бодлого | Тохиргоо) + [Сурагчийн
 * харагдац] [Засах] [⋯]. Табыг анх нээхэд л ачаална (Radix-ийн
 * идэвхгүй таб DOM-д байхгүй). Өөр багш энэ шалгалтыг зэрэг нээсэн бол
 * «Б. Баасанжав нээсэн байна» (hooks/usePresence — 45 сек тутам жижиг дохио).
 */
export default function ExamPanel({
  exam,
  canEdit,
  canDelete,
  canDuplicate,
  youtube,
  onChanged,
}: {
  exam: ExamOverviewRow;
  canEdit: boolean;
  canDelete: boolean;
  canDuplicate: boolean;
  youtube: boolean;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<TabKey>(exam.classes.length ? "grades" : "settings");
  const [preview, setPreview] = useState(false);
  // Тойм, Бодлого хоёр ижил ангийн хүрээ, нэг анализын хариуг хуваалцана.
  const [scope, setScope] = useState("all");
  const [focusKey, setFocusKey] = useState<string | null>(null);
  // «⋯ → Өөрчлөлтийн түүх»-ээс сэргээсний дараа табуудыг шинэ өгөгдлөөр ачаална
  const [revision, setRevision] = useState(0);
  const presenceKey = `exam:${exam.id}`;
  const presence = usePresence([presenceKey]);
  const changed = () => {
    invalidateExamAnalytics(exam.id);
    onChanged();
  };

  return (
    <div className="border-t border-line bg-panel/40 px-3 py-3 sm:px-5">
      <Tabs
        value={tab}
        onValueChange={(v) => {
          // Тохиргоо табын хадгалаагүй алхмын багц таб солиход алга болохгүй
          if (!confirmDiscardUnsaved()) return;
          setTab(v as TabKey);
          if (v !== "problems") setFocusKey(null);
        }}
      >
        <PresenceBadge editors={presence[presenceKey]} verb="нээсэн байна" className="mb-2" />
        <div className="flex flex-wrap items-center gap-2">
          <TabsList className="mx-0 min-w-0 flex-1 px-0" aria-label="Шалгалтын хэсгүүд">
            <TabsTrigger value="overview">Тойм</TabsTrigger>
            <TabsTrigger value="grades">Дүн</TabsTrigger>
            <TabsTrigger value="problems">Бодлого</TabsTrigger>
            <TabsTrigger value="settings">Тохиргоо</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" type="button" onClick={() => setPreview(true)}>
              <Eye aria-hidden /> <span className="hidden sm:inline">Сурагчийн харагдац</span>
              <span className="sr-only sm:hidden">Сурагчийн харагдац</span>
            </Button>
            {canEdit && (
              <Button size="sm" variant="ghost" asChild>
                <Link href={`/app/tests/${exam.id}/edit`}>
                  <Pencil aria-hidden /> <span className="hidden sm:inline">Засах</span>
                  <span className="sr-only sm:hidden">Засах</span>
                </Link>
              </Button>
            )}
            <MoreMenu
              testId={exam.id}
              title={exam.title}
              canDuplicate={canDuplicate}
              canDelete={canDelete}
              youtube={youtube}
              history
              onChanged={() => {
                changed();
                setRevision((r) => r + 1);
              }}
            />
          </div>
        </div>
        <div className="mt-3">
          <TabsContent value="overview">
            <OverviewTab
              testId={exam.id}
              classId={scope}
              onClassChange={setScope}
              onOpenItem={(key) => {
                setFocusKey(key);
                setTab("problems");
              }}
            />
          </TabsContent>
          <TabsContent value="grades">
            <GradesTab testId={exam.id} onChanged={changed} />
          </TabsContent>
          <TabsContent value="problems">
            <ProblemsTab testId={exam.id} classId={scope} onClassChange={setScope} focusKey={focusKey} />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab key={revision} testId={exam.id} onChanged={changed} />
          </TabsContent>
        </div>
      </Tabs>
      <StudentViewDialog testId={exam.id} open={preview} onOpenChange={setPreview} />
    </div>
  );
}

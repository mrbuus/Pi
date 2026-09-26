"use client";

import { PageHeader } from "@/components/ui/Surface";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import TopicMasteryPanel from "./TopicMasteryPanel";
import ProblemQualityPanel from "./ProblemQualityPanel";
import DistractorAnalysisPanel from "./DistractorAnalysisPanel";

export default function InsightsDashboard() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Дүн шинжилгээ"
        description="Сурагчдын оролдлогоос хэмжсэн сэдвийн эзэмшил, бодлогын чанар, сонголтын тархалтыг харна."
      />
      <Tabs defaultValue="topics" className="space-y-5">
        <TabsList className="w-full overflow-x-auto border-line [&>button.border-primary]:border-brand [&>button.border-primary]:text-brand-soft [&>button.border-transparent]:text-ink-dim">
          <TabsTrigger value="topics" className="min-h-12 min-w-0 flex-1 px-1 text-xs sm:px-3 sm:text-sm">Сэдвийн эзэмшил</TabsTrigger>
          <TabsTrigger value="quality" className="min-h-12 min-w-0 flex-1 px-1 text-xs sm:px-3 sm:text-sm">Бодлогын чанар</TabsTrigger>
          <TabsTrigger value="choices" className="min-h-12 min-w-0 flex-1 px-1 text-xs sm:px-3 sm:text-sm">Андуурсан сонголт</TabsTrigger>
        </TabsList>
        <TabsContent value="topics"><TopicMasteryPanel /></TabsContent>
        <TabsContent value="quality"><ProblemQualityPanel /></TabsContent>
        <TabsContent value="choices"><DistractorAnalysisPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { CalendarClock, Table2 } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/kit/tabs";
import { confirmDiscardUnsaved } from "@/lib/unsavedChanges";
import TeacherHoursClient from "./TeacherHoursClient";
import WorkSheet from "./WorkSheet";

/**
 * /app/teacher-hours (эзэн 2026-11-08): үндсэн таб нь гараар бөглөдөг «Ажилласан
 * цаг» хүснэгт. Өмнөх «Хуваарийн тооцоолсон цаг» нь хуваариас автоматаар
 * тооцдог тул лавлагаа болгон хоёр дахь табд хэвээр үлдсэн (функц устгахгүй).
 */
export default function TeacherHoursTabs() {
  const [tab, setTab] = useState("sheet");
  return (
    <div className="space-y-4">
      <h1 className="cyrillic-heading text-xl font-bold text-ink sm:text-2xl">Ажилласан цаг</h1>
      <Tabs
        value={tab}
        onValueChange={(next) => {
          if (next !== "sheet" && !confirmDiscardUnsaved()) return;
          setTab(next);
        }}
      >
        <TabsList aria-label="Цагийн харагдац">
          <TabsTrigger value="sheet">
            <Table2 aria-hidden />
            Ажилласан цаг
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <CalendarClock aria-hidden />
            Хуваариас тооцоолсон
          </TabsTrigger>
        </TabsList>
        <TabsContent value="sheet" className="mt-4">
          <WorkSheet />
        </TabsContent>
        <TabsContent value="schedule" className="mt-4">
          <TeacherHoursClient />
        </TabsContent>
      </Tabs>
    </div>
  );
}

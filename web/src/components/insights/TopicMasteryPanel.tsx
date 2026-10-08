"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { Card, SectionHeader } from "@/components/ui/Surface";
import type { ClassroomOption, TopicMastery } from "./types";
import TopicHeatmap from "./TopicHeatmap";

export default function TopicMasteryPanel() {
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [classroomId, setClassroomId] = useState("");
  const [classroomLoading, setClassroomLoading] = useState(true);
  const [classroomError, setClassroomError] = useState(false);
  const [classroomRetry, setClassroomRetry] = useState(0);
  const [rows, setRows] = useState<TopicMastery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    api<ClassroomOption[]>("/classrooms")
      .then((result) => {
        if (!active) return;
        setClassrooms(result);
        if (!result.length) setLoading(false);
        else setClassroomId((current) => current || result[0].id);
      })
      .catch(() => { if (active) setClassroomError(true); })
      .finally(() => { if (active) setClassroomLoading(false); });
    return () => { active = false; };
  }, [classroomRetry]);

  useEffect(() => {
    if (!classroomId) return;
    let active = true;
    api<TopicMastery[]>(`/insights/topic-mastery?${new URLSearchParams({ classroomId, limit: "50" })}`)
      .then((result) => { if (active) setRows(result); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [classroomId, retry]);

  function chooseClassroom(value: string) {
    setClassroomId(value);
    setRows([]);
    setError(false);
    setLoading(true);
  }

  if (classroomError) {
    return <ErrorState message="Ангийн жагсаалт ачаалсангүй. Дахин оролдоно уу." onRetry={() => { setClassroomError(false); setClassroomLoading(true); setClassroomRetry((value) => value + 1); }} />;
  }

  if (classroomLoading) return <LoadingState rows={3} label="Анги ачаалж байна" />;
  if (!classrooms.length) return <EmptyState title="Анги бүртгэгдээгүй байна" hint="Сурагчдын сэдвийн эзэмшлийг харахын тулд эхлээд анги сонгох боломжтой байх шаардлагатай." />;

  return (
    <div className="space-y-4">
      <Card padding="tight">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label htmlFor="insights-classroom" className="font-semibold">Анги сонгох</label>
          <select id="insights-classroom" value={classroomId} onChange={(event) => chooseClassroom(event.target.value)} className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-base sm:max-w-sm">
            {classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}{classroom.grade ? ` — ${classroom.grade}-р анги` : ""}</option>)}
          </select>
        </div>
      </Card>
      {loading && <LoadingState rows={6} label="Сэдвийн эзэмшил ачаалж байна" />}
      {!loading && error && <ErrorState message="Сэдвийн эзэмшлийн мэдээлэл ачаалсангүй. Дахин оролдоно уу." onRetry={() => { setError(false); setLoading(true); setRetry((value) => value + 1); }} />}
      {!loading && !error && rows.length === 0 && <EmptyState title="Одоогоор оролдлогын өгөгдөл алга" hint="Сурагчид тест бөглөсний дараа энд гарна." />}
      {!loading && !error && rows.length > 0 && <TopicHeatmap rows={rows} />}
      {!loading && !error && rows.length > 0 && <Card padding="tight"><SectionHeader title="Хэмжилтийн хамрах хүрээ" /><p className="text-sm text-ink-dim">Сонгосон ангийн хэмжсэн 50 хүртэлх сурагчийг харуулна. Хувь нь зөв бодсон бодлогын тоог хэмжсэн бодлогын тоонд хуваасан утга юм.</p></Card>}
    </div>
  );
}

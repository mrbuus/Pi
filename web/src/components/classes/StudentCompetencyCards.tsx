"use client";

import { useEffect, useState } from "react";
import InsightScoreCards, { type SkillScoreData } from "@/components/students/hub/InsightScoreCards";
import { api } from "@/lib/api";
import type { Competency } from "./types";

/**
 * Сурагчийн хабын «Түвшин, чадварын оноо» картыг «Анги» самбарын чадамжийн
 * оноогоор (v0) дүүргэнэ. Мэдээлэл хангалтгүй, эрхгүй, алдаа гарвал хуучин
 * «Тун удахгүй» төлөв хэвээр (тоо зохиохгүй). ЭЕШ-ийн таамаг — хоосон.
 */
export default function StudentCompetencyCards({ studentId }: { studentId: string }) {
  const [skill, setSkill] = useState<SkillScoreData | null>(null);

  useEffect(() => {
    let alive = true;
    api<{ competency: Competency | null }>(`/class-dashboard/students/${encodeURIComponent(studentId)}/competency`)
      .then((r) => {
        const c = r.competency;
        if (!alive || !c || c.score === null) return;
        setSkill({
          score: c.score,
          max: 100,
          level: c.level ? `${c.level}, v0 туршилтын` : "v0 туршилтын",
          trend: c.trend,
          updatedAt: c.updatedAt ?? null,
        });
      })
      .catch(() => {
        /* эрхгүй/сүлжээгүй — «Тун удахгүй» хэвээр */
      });
    return () => {
      alive = false;
    };
  }, [studentId]);

  return <InsightScoreCards skill={skill} prediction={null} />;
}

"use client";

import Link from "next/link";
import { ArrowRight, Gauge } from "lucide-react";
import { Card } from "@/components/ui/kit/card";
import type { ReadinessData } from "./ReadinessTypes";

export function ReadinessMiniCard({ data }: { data: ReadinessData }) {
  return (
    <Card className="bg-brand/5 p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Gauge className="h-6 w-6 text-brand-soft" aria-hidden />
          <div><p className="font-extrabold text-ink">Бэлэн байдал</p><p className="text-sm text-ink-dim">{data.coverage ? `~${data.index}` : "—"} ({data.low}–{data.high})</p></div>
        </div>
        <Link href="/app/readiness" className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 font-bold text-brand-soft hover:bg-brand/10">Дэлгэрэнгүй <ArrowRight className="h-4 w-4" aria-hidden /></Link>
      </div>
    </Card>
  );
}

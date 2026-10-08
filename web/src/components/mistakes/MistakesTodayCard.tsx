"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { Button } from "@/components/ui/kit/button";
import { Card, CardContent } from "@/components/ui/kit/card";
import { api } from "@/lib/api";

export default function MistakesTodayCard() {
  const [state, setState] = useState<{ count?: number; error?: boolean } | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    api<unknown[]>("/mistakes/today")
      .then(items => { if (active) setState({ count: items.length }); })
      .catch(() => { if (active) setState({ error: true }); });
    return () => { active = false; };
  }, [revision]);
  return <Card className="bg-accent-gold/10"><CardContent className="space-y-3">
    <h2 className="flex items-center gap-2 font-bold"><RotateCw aria-hidden className="h-5 w-5" />Өнөөдрийн алдааны давтлага</h2>
    {!state ? <LoadingState rows={1} /> : state.error ? <ErrorState message="Давтлага ачаалсангүй" onRetry={() => { setState(null); setRevision(old => old + 1); }} />
      : <p>{state.count ? `Өнөөдөр ${state.count} бодлого давтахаар байна.` : "Өнөөдөр товлосон бодлого алга."}</p>}
    <Button asChild variant="outline"><Link href="/app/mistakes">Алдааны дэвтрээ нээх</Link></Button>
  </CardContent></Card>;
}

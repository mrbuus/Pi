"use client";

import { useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { Card, CardContent } from "@/components/ui/kit/card";
import { api } from "@/lib/api";

type Topic = { topic: string; count: number };
export default function TopicWeaknessList({ studentId }: { studentId: string }) {
  const [state, setState] = useState<{ key: string; topics?: Topic[]; error?: boolean } | null>(null);
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([studentId, revision]);
  useEffect(() => {
    let active = true;
    api<{ weakestTopics: Topic[] }>(`/mistakes/student/${encodeURIComponent(studentId)}`)
      .then(data => { if (active) setState({ key, topics: data.weakestTopics }); })
      .catch(() => { if (active) setState({ key, error: true }); });
    return () => { active = false; };
  }, [studentId, key]);
  return <Card className="bg-surface"><CardContent className="space-y-3">
    <h2 className="font-bold">Давтахад анхаарах сэдэв</h2>
    {!state || state.key !== key ? <LoadingState rows={2} /> : state.error ? <ErrorState message="Сэдвийн мэдээлэл ачаалсангүй" onRetry={() => setRevision(old => old + 1)} />
      : !state.topics?.length ? <EmptyState title="Давтаагүй алдаа алга" />
        : <ul className="space-y-2">{state.topics.map(item => <li key={item.topic} className="flex justify-between gap-3 rounded-xl bg-accent-rose/10 px-3 py-2">
          <span>{item.topic}</span><strong className="shrink-0">{item.count} бодлого</strong>
        </li>)}</ul>}
  </CardContent></Card>;
}

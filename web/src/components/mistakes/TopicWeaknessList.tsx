"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function TopicWeaknessList({ studentId }: { studentId: string }) {
  const [topics, setTopics] = useState<{ topic: string; count: number }[]>([]);
  useEffect(() => { api<{ weakestTopics: { topic: string; count: number }[] }>(`/mistakes/student/${studentId}`).then((data) => setTopics(data.weakestTopics)).catch(() => setTopics([])); }, [studentId]);
  if (!topics.length) return null;
  return <section className="chunky rounded-3xl bg-surface p-4"><h2 className="font-bold">Давтахад анхаарах сэдэв</h2><ul className="mt-3 space-y-2">{topics.map((item) => <li key={item.topic} className="flex justify-between rounded-xl bg-accent-rose/10 px-3 py-2"><span>{item.topic}</span><strong>{item.count}</strong></li>)}</ul></section>;
}

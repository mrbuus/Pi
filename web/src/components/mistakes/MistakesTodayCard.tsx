"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import { api } from "@/lib/api";

export default function MistakesTodayCard() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => { api<unknown[]>("/mistakes/today").then((items) => setCount(items.length)).catch(() => setCount(null)); }, []);
  return <Link href="/app/mistakes" className="chunky chunky-press flex min-h-16 items-center justify-between rounded-2xl bg-accent-gold/10 p-4"><span className="flex items-center gap-2 font-bold"><RotateCw className="h-5 w-5" />Өнөөдрийн алдааны давтлага</span><span className="rounded-full bg-accent-gold/20 px-3 py-1 font-bold">{count === null ? "" : count}</span></Link>;
}

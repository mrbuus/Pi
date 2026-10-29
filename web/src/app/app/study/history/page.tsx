"use client";

import Link from "next/link";
import ReviewHistory from "@/components/study/ReviewHistory";
import { StudentComingSoon } from "@/components/ui/ComingSoon";

export default function StudyHistoryPage() {
  return <StudentComingSoon title="Давтлага"><div className="mx-auto w-full max-w-2xl min-w-0 space-y-5">
    <Link href="/app/study" className="inline-flex min-h-11 items-center text-sm font-medium text-brand underline underline-offset-4">Суралцах руу буцах</Link>
    <h1 className="text-2xl font-bold">Хувийн давталтын түүх</h1>
    <ReviewHistory />
  </div></StudentComingSoon>;
}

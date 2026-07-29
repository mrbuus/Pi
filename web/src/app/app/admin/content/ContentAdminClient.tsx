"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import BooksPanel from "@/components/content-admin/BooksPanel";
import ChaptersPanel from "@/components/content-admin/ChaptersPanel";
import ProblemsPanel from "@/components/content-admin/ProblemsPanel";
import TopicsPanel from "@/components/content-admin/TopicsPanel";
import VideosPanel from "@/components/content-admin/VideosPanel";
import TestsPanel from "@/components/content-admin/TestsPanel";
import { useDeletedLog } from "@/components/content-admin/useDeletedLog";
import { Book } from "@/components/content-admin/types";
import RequireRole from "@/components/nav/RequireRole";

type Tab = "content" | "topics" | "videos" | "tests";

const TABS: { v: Tab; t: string }[] = [
  { v: "content", t: "Ном / Бүлэг / Бодлого" },
  { v: "topics", t: "БҮТ мужууд" },
  { v: "videos", t: "Бичлэг" },
  { v: "tests", t: "Тест" },
];

export default function ContentAdminClient() {
  const [tab, setTab] = useState<Tab>("content");

  // Ном → Бүлэг сэдэв → Бодлого гурвалсан урсгалын (pipeline) сонголт
  const [bookId, setBookId] = useState("");
  const [chapterId, setChapterId] = useState("");

  // Бүлэг сэдвийг өөр ном руу шилжүүлэх сонголтод хэрэгтэй бүх номын
  // жагсаалт (хичээлээр шүүхгүй, бүрэн жагсаалт)
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  useEffect(() => {
    api<Book[]>("/books").then(setAllBooks).catch(() => setAllBooks([]));
  }, []);

  const { record, byKind } = useDeletedLog();

  return (
    <RequireRole allow={["ADMIN", "TEACHER_PLUS"]}>
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/app/admin" className="text-sm text-ink-dim hover:text-ink">
          ← Удирдлага
        </Link>
        <h1 className="text-2xl font-extrabold">Контент удирдах</h1>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-line pb-3">
        {TABS.map((t) => (
          <button
            key={t.v}
            onClick={() => setTab(t.v)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              tab === t.v
                ? "bg-brand-bright text-on-brand"
                : "text-ink-dim hover:bg-bg hover:text-ink"
            }`}
          >
            {t.t}
          </button>
        ))}
      </div>

      {tab === "content" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <BooksPanel
            selectedId={bookId}
            onSelect={(id) => {
              setBookId(id);
              setChapterId("");
              api<Book[]>("/books").then(setAllBooks).catch(() => {});
            }}
            deletedEntries={byKind("book")}
            onDeleted={(e) => record(e)}
          />
          <ChaptersPanel
            bookId={bookId}
            books={allBooks}
            selectedId={chapterId}
            onSelect={(id) => setChapterId(id)}
            deletedEntries={byKind("chapter")}
            onDeleted={(e) => record(e)}
          />
          <ProblemsPanel
            chapterId={chapterId}
            deletedEntries={byKind("problem")}
            onDeleted={(e) => record(e)}
          />
        </div>
      )}

      {tab === "topics" && (
        <TopicsPanel deletedEntries={byKind("topic")} onDeleted={(e) => record(e)} />
      )}

      {tab === "videos" && (
        <VideosPanel deletedEntries={byKind("video")} onDeleted={(e) => record(e)} />
      )}

      {tab === "tests" && (
        <TestsPanel deletedEntries={byKind("test")} onDeleted={(e) => record(e)} />
      )}
    </div>
    </RequireRole>
  );
}

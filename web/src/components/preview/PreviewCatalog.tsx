"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { api } from "@/lib/api";
import MathText from "@/components/MathText";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateBlock";
interface Chapter {
  id: string;
  title: string;
  order: number;
}
interface Book {
  id: string;
  title: string;
  code: string;
  chapters: Chapter[];
}
interface Sample {
  id: string;
  title: string;
  problems: { id: string; token: string; statementText: string | null }[];
}
function ChapterSample({ id }: { id: string }) {
  const [sample, setSample] = useState<Sample | null>(null),
    [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    api<Sample>(`/catalog/preview/chapters/${encodeURIComponent(id)}`, {
      auth: false,
    })
      .then((data) => {
        if (active) {
          setSample(data);
          setFailed(false);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [id, retry]);
  if (failed)
    return (
      <ErrorState
        message="Бодлогыг авч чадсангүй. Бүлэг архивлагдсан байж болно."
        onRetry={() => {
          setFailed(false);
          setRetry((n) => n + 1);
        }}
      />
    );
  if (!sample) return <LoadingState rows={3} />;
  if (!sample.problems.length)
    return (
      <EmptyState
        title="Энэ бүлэгт бодлого хараахан ороогүй"
        hint="Өөр бүлэг сонгож үзээрэй."
      />
    );
  return (
    <section aria-label="Үнэгүй бодлогууд" className="space-y-4">
      <h2 className="text-xl font-semibold">{sample.title}</h2>
      {sample.problems.map((p, i) => (
        <article
          key={p.id}
          className="min-w-0 space-y-3 overflow-x-auto chunky p-4"
        >
          <h3 className="text-sm font-semibold text-ink-dim">
            Бодлого {i + 1}
          </h3>
          {p.statementText ? (
            <MathText>{p.statementText}</MathText>
          ) : (
            <p className="text-ink-dim">
              Энэ бодлогын текст хараахан бэлэн болоогүй.
            </p>
          )}
        </article>
      ))}
      <p className="text-sm text-ink-dim">
        Зөвхөн бодлогын нөхцөл харагдана. Хариу, бодолт, видео энэ хэсэгт
        орохгүй.
      </p>
    </section>
  );
}
export default function PreviewCatalog() {
  const [books, setBooks] = useState<Book[] | null>(null),
    [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0),
    [bookId, setBookId] = useState(""),
    [chapterId, setChapterId] = useState("");
  useEffect(() => {
    let active = true;
    api<Book[]>("/catalog/preview/books", { auth: false })
      .then((data) => {
        if (active) {
          setBooks(data);
          setFailed(false);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [retry]);
  const selected = books?.find((b) => b.id === bookId);
  return (
    <main className="mx-auto min-w-0 max-w-3xl space-y-6 px-4 py-8 text-ink">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center text-brand underline"
      >
        Нүүр хуудас
      </Link>
      <div className="space-y-2">
        <BookOpen className="h-7 w-7 text-brand" aria-hidden />
        <h1 className="cyrillic-heading text-3xl font-bold">
          Номыг урьдчилан үзэх
        </h1>
        <p className="text-ink-dim">
          Ном, бүлгээ сонгоод эхний 3 бодлогын нөхцөлийг үнэгүй уншаарай.
        </p>
      </div>
      {failed ? (
        <ErrorState
          message="Номын жагсаалтыг авч чадсангүй"
          onRetry={() => {
            setFailed(false);
            setRetry((n) => n + 1);
          }}
        />
      ) : books === null ? (
        <LoadingState rows={3} />
      ) : !books.length ? (
        <EmptyState title="Одоогоор нийтэлсэн ном алга" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="min-w-0 space-y-2">
            Ном
            <select
              aria-label="Ном"
              value={bookId}
              onChange={(e) => {
                setBookId(e.target.value);
                setChapterId("");
              }}
              className="block min-h-11 w-full rounded-xl border border-line bg-bg px-3"
            >
              <option value="">Ном сонгоно уу</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 space-y-2">
            Бүлэг
            <select
              disabled={!selected}
              aria-label="Бүлэг"
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
              className="block min-h-11 w-full rounded-xl border border-line bg-bg px-3 disabled:opacity-50"
            >
              <option value="">Бүлэг сонгоно уу</option>
              {selected?.chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {selected && !selected.chapters.length && (
        <EmptyState title="Энэ номд бүлэг хараахан ороогүй" />
      )}
      {chapterId && <ChapterSample key={chapterId} id={chapterId} />}
      <aside className="space-y-3 rounded-2xl border border-brand/25 bg-brand/5 p-5">
        <h2 className="text-lg font-semibold">Цааш суралцах</h2>
        <p className="text-sm text-ink-dim">
          Бүртгэл үүсгээд өөрт тохирох ном, эрхийн мэдээлэлтэй танилцаарай.
          Бүртгэл үүсгэх нь бүх төлбөртэй агуулгыг нээхгүй.
        </p>
        <Link
          href="/register"
          className="inline-flex min-h-11 items-center rounded-xl bg-brand px-5 font-semibold text-on-brand"
        >
          Бүртгүүлэх
        </Link>
      </aside>
    </main>
  );
}

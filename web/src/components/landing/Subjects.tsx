"use client";

import { Pi, Scale } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";

interface Book {
  id: string;
  code: string;
  title: string;
  _count: { chapters: number };
}

interface Chapter {
  id: string;
  title: string;
  order: number;
  freePreview: boolean;
  _count: { problems: number; theories: number };
}

function splitChapterTitle(title: string) {
  const [topic, ...rest] = title.split(" · ");
  return {
    topic: topic?.trim() || title,
    label: rest.join(" · ").trim() || title,
  };
}

type SubjectKey = "MATH" | "SOCIAL_STUDIES";

interface SubjectMeta {
  key: SubjectKey;
  icon: typeof Pi;
  title: string;
  description: string;
}

// Хоёр хичээл ЯМАГТ тусдаа карт байна — нэг ерөнхий блок болгож
// нэгтгэхгүй (SPEC-ийн тодорхой шаардлага).
const SUBJECTS: SubjectMeta[] = [
  {
    key: "MATH",
    icon: Pi,
    title: "Математик",
    description:
      "Алгебр, геометр, тригонометр, магадлал зэрэг ЭЕШ-ийн бүх сэдвийг хамарсан бодлогын сангаар элсэлтийн шалгалтад бэлддэг. Үүнээс гадна хичээлээсээ хоцорсон сурагчдад зориулсан түвшин ахиулах танхимын анги тусдаа ажилладаг.",
  },
  {
    key: "SOCIAL_STUDIES",
    icon: Scale,
    title: "Нийгмийн ухаан",
    description:
      "Түүх, эрх зүй, эдийн засаг, философийн үндэс — ЭЕШ-ийн нийгмийн ухааны хөтөлбөрт нийцсэн, элсэлтийн шалгалтад чиглэсэн танхимын бэлтгэл.",
  },
];

function SubjectCard({ meta }: { meta: SubjectMeta }) {
  const [open, setOpen] = useState(false);
  const [books, setBooks] = useState<Book[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && books === null) {
      setLoading(true);
      setLoadError(false);
      try {
        const result = await api<Book[]>(`/books?subject=${meta.key}`, {
          auth: false,
        });
        setBooks(result);
      } catch {
        // Fallback хуурамч өгөгдөл ХЭЗЭЭ Ч харуулахгүй — зөвхөн чимээгүй
        // алдааны төлөв. Нийтийн хуудсанд бодит бус мэдээлэл харуулж болохгүй.
        setBooks([]);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
  }

  async function openBook(book: Book) {
    setSelectedBook(book);
    setChaptersLoading(true);
    setChapters([]);
    try {
      const result = await api<Chapter[]>(`/chapters?bookId=${book.id}`, {
        auth: false,
      });
      setChapters(result);
    } catch {
      setChapters([]);
    } finally {
      setChaptersLoading(false);
    }
  }

  return (
    <div className="reveal rounded-2xl border border-line bg-panel p-7">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        <meta.icon aria-hidden size={28} strokeWidth={2.25} />
      </div>
      <h3 className="mt-5 text-xl font-extrabold text-ink">{meta.title}</h3>
      <p className="mt-2.5 text-sm leading-relaxed text-ink-dim">
        {meta.description}
      </p>

      <button
        type="button"
        onClick={() => void toggleOpen()}
        aria-expanded={open}
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition hover:underline"
      >
        {open ? "Нуух ↑" : "Бодлогын сан харах →"}
      </button>

      {open && (
        <div className="mt-4 rounded-xl border border-line bg-surface p-4">
          {loading ? (
            <p className="text-sm text-ink-dim">Ачаалж байна…</p>
          ) : loadError ? (
            <p className="text-sm text-error">
              Мэдээлэл ачаалахад алдаа гарлаа. Дараа дахин оролдоно уу.
            </p>
          ) : books && books.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {books.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => void openBook(b)}
                  aria-pressed={selectedBook?.id === b.id}
                  className={`rounded-lg border p-3 text-left text-sm transition ${
                    selectedBook?.id === b.id
                      ? "border-brand bg-brand/5"
                      : "border-line hover:border-brand/40"
                  }`}
                >
                  <span className="block font-bold text-ink">{b.code}</span>
                  <span className="mt-0.5 block truncate text-xs text-ink-dim">
                    {b.title} · {b._count.chapters} бүлэг
                  </span>
                </button>
              ))}
            </div>
          ) : (
            // Бодит API хоосон буцаасан жинхэнэ төлөв — зохиомол сэдэв
            // нэмэхгүйгээр үнэнч эмптиг харуулна.
            <p className="text-sm text-ink-dim">
              Энэ хичээлээр цахим бодлогын сан удахгүй нэмэгдэнэ.
            </p>
          )}

          {selectedBook && (
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-brand">
                {selectedBook.code} · бүлэг сэдэв
              </p>
              {chaptersLoading ? (
                <p className="mt-2 text-sm text-ink-dim">
                  Сэдвүүд ачаалж байна…
                </p>
              ) : chapters.length > 0 ? (
                <ul className="mt-2 grid gap-1.5">
                  {chapters.slice(0, 6).map((c, i) => {
                    const { topic, label } = splitChapterTitle(c.title);
                    return (
                      <li key={c.id} className="flex items-center gap-2.5 text-sm">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand/10 text-xs font-bold text-brand">
                          {i + 1}
                        </span>
                        <span className="min-w-0 truncate text-ink-dim">
                          <span className="text-ink">{label}</span> · {topic} ·{" "}
                          {c._count.problems} бодлого
                          {c.freePreview ? " · үнэгүй" : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-ink-dim">
                  Энэ номд бүлэг сэдэв хараахан нэмэгдээгүй байна.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Subjects() {
  return (
    <section id="subjects" className="relative scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <p className="reveal text-sm font-bold uppercase tracking-[0.2em] text-brand">
          Хичээлүүд
        </p>
        <h2 className="reveal mt-3 max-w-2xl text-3xl font-extrabold md:text-4xl">
          Элсэлтийн шалгалтын бэлтгэл, мөн түвшин ахиулах сургалт
        </h2>
        <p className="reveal mt-4 max-w-2xl text-base leading-relaxed text-ink-dim">
          Математик, нийгмийн ухааны хичээлээр элсэлтийн шалгалтад бэлддэгээс
          гадна, математикийн хоцрогдол арилгаж түвшин ахиулах танхимын анги
          тусдаа ажилладаг.
        </p>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {SUBJECTS.map((meta) => (
            <SubjectCard key={meta.key} meta={meta} />
          ))}
        </div>
      </div>
    </section>
  );
}

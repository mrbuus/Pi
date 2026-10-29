"use client";

import { ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";
import { useId, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Meta } from "@/components/ui/Meta";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/kit/button";
import styles from "./sections.module.css";

interface Book { id: string; code: string; title: string; displayName?: string | null; _count: { chapters: number } }
interface Chapter { id: string; title: string; order: number; freePreview: boolean; _count: { problems: number; theories: number } }
type SubjectKey = "MATH" | "SOCIAL_STUDIES";
interface SubjectMeta { key: SubjectKey; title: string; description: string; topics: string[] }

// The two subjects stay separate, including their independently loaded book lists.
const SUBJECTS: SubjectMeta[] = [
  { key: "MATH", title: "Математик", description: "ЭЕШ-ийн бэлтгэл, хоцрогдол арилгах, түвшин ахиулах танхимын сургалт. Цахим ном, бодлогоор бие даан давтах боломжтой.", topics: ["Алгебр", "Геометр", "Тригонометр", "Магадлал"] },
  { key: "SOCIAL_STUDIES", title: "Нийгмийн ухаан", description: "ЭЕШ-ийн нийгмийн ухааны хөтөлбөрт нийцсэн танхимын сургалт. Сэдвээ ойлгож, холбоо хамаарлыг нь тайлбарлаж сурна.", topics: ["Түүх", "Эрх зүй", "Эдийн засаг", "Философи"] },
];

function SubjectSketch({ math }: { math: boolean }) {
  return <svg className={styles.subjectSketch} viewBox="0 0 220 155" fill="none" aria-hidden="true">
    {math ? <>
      <path d="M25 126H199M43 141V15" className={styles.sketchGuide} />
      <circle cx="121" cy="76" r="48" className={styles.sketchCircle} />
      <path d="M73 76H169L121 28V124L73 76Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M43 126L169 28M121 76L169 28" className={styles.sketchGuide} />
      <circle cx="121" cy="76" r="3" fill="currentColor" />
      <text x="183" y="118" fill="currentColor" className={styles.mathLabel}>x</text>
      <text x="51" y="23" fill="currentColor" className={styles.mathLabel}>y</text>
      <text x="134" y="97" fill="currentColor" className={styles.mathLabel}>π</text>
    </> : <>
      <path d="M111 22V132M67 132H155M47 46L174 35" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="111" cy="41" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M58 45L33 92H83L58 45ZM161 36L136 83H186L161 36Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M33 92Q58 115 83 92M136 83Q161 106 186 83" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="111" cy="76" r="59" className={styles.sketchGuide} />
      <path d="M19 132H202" className={styles.sketchGuide} />
    </>}
  </svg>;
}

function SubjectCard({ meta, index }: { meta: SubjectMeta; index: number }) {
  const [open, setOpen] = useState(false);
  const [books, setBooks] = useState<Book[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [chaptersError, setChaptersError] = useState(false);
  const chapterRequest = useRef(0);
  const panelId = useId();

  async function loadBooks() {
    setLoading(true); setLoadError(false);
    try { setBooks(await api<Book[]>(`/books?subject=${meta.key}`, { auth: false })); }
    catch { setLoadError(true); }
    finally { setLoading(false); }
  }
  function toggleOpen() {
    setOpen(!open);
    if (!open && books === null && !loading) void loadBooks();
  }
  async function openBook(book: Book) {
    const request = ++chapterRequest.current;
    setSelectedBook(book); setChaptersLoading(true); setChapters([]); setChaptersError(false);
    try {
      const result = await api<Chapter[]>(`/chapters?bookId=${book.id}`, { auth: false });
      if (request === chapterRequest.current) setChapters(result);
    } catch { if (request === chapterRequest.current) setChaptersError(true); }
    finally { if (request === chapterRequest.current) setChaptersLoading(false); }
  }

  return <article className={`reveal ${styles.subjectCard}`}>
    <div className={styles.subjectTop}><span className={styles.index}>0{index + 1} / Хичээл</span><ArrowUpRight size={20} aria-hidden /></div>
    <SubjectSketch math={meta.key === "MATH"} />
    <h3 className={`cyrillic-heading ${styles.subjectTitle}`}>{meta.title}</h3>
    <p className={styles.subjectDescription}>{meta.description}</p>
    <ul className={styles.topicList} aria-label={`${meta.title} сэдвүүд`}>{meta.topics.map(topic => <li key={topic}>{topic}</li>)}</ul>
    <Button type="button" variant="link" className={styles.subjectToggle} onClick={toggleOpen} aria-expanded={open} aria-controls={panelId}>
      {open ? "Бодлогын санг хураах" : "Бодлогын сан харах"}{open ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
    </Button>
    {open && <div id={panelId} className={styles.bookPanel} aria-busy={loading || chaptersLoading}>
      {loading ? <div role="status" className={styles.loading}><span className="sr-only">Номын сан ачаалж байна</span><SkeletonLine height={16} /><SkeletonLine width="75%" height={16} /><SkeletonLine width="85%" height={16} /></div>
        : loadError ? <div><p className="text-sm text-error">Номын санг ачаалж чадсангүй.</p><Button variant="link" onClick={() => void loadBooks()}>Дахин оролдох</Button></div>
          : books?.length ? <div className={styles.bookGrid}>{books.map(book => <button key={book.id} type="button" onClick={() => void openBook(book)} aria-pressed={selectedBook?.id === book.id} className={styles.bookChoice}>
            <strong>{book.displayName || book.title}</strong><span><Meta items={[`${book._count.chapters} бүлэг`]} /></span>
          </button>)}</div>
            : <p className={styles.smallCopy}>Энэ хичээлийн цахим бодлогын сан хараахан нийтлэгдээгүй.</p>}
      {selectedBook && <div className={styles.chapterPanel}>
        <p className={styles.eyebrow}><Meta items={[selectedBook.code, "Бүлэг сэдэв"]} /></p>
        {chaptersLoading ? <div role="status" className={styles.loading}><span className="sr-only">Сэдвүүд ачаалж байна</span><SkeletonLine /><SkeletonLine width="70%" /></div>
          : chaptersError ? <div><p className="text-sm text-error">Сэдвүүдийг ачаалж чадсангүй.</p><Button variant="link" onClick={() => void openBook(selectedBook)}>Дахин оролдох</Button></div>
            : chapters.length ? <ul className={styles.chapterList}>{chapters.slice(0, 6).map((chapter, i) => {
              const [topic, ...rest] = chapter.title.split(" · ");
              const label = rest.join(" — ").trim() || chapter.title;
              return <li key={chapter.id}><span className={styles.chapterIndex}>{i + 1}</span><span><Meta items={[label, topic?.trim(), `${chapter._count.problems} бодлого`, chapter.freePreview && "үнэгүй"]} /></span></li>;
            })}</ul> : <p className={styles.smallCopy}>Энэ номд бүлэг сэдэв хараахан нэмэгдээгүй.</p>}
      </div>}
    </div>}
  </article>;
}

export default function Subjects() {
  return <section id="subjects" className={styles.section}>
    <div className={styles.container}>
      <div className={`reveal ${styles.sectionHeading}`}>
        <div><p className={styles.eyebrow}>01 / Сурах чиглэл</p><h2 className={`cyrillic-heading ${styles.heading}`}>Ойлголтоос<br /><span className={styles.blue}>бодолт руу.</span></h2></div>
        <p className={styles.headingAside}>Элсэлтийн шалгалтад бэлдэх, эсвэл сууриа бататгах. Өөрт тохирох хичээлээс эхлээрэй.</p>
      </div>
      <div className={styles.subjectGrid}>{SUBJECTS.map((meta, index) => <SubjectCard key={meta.key} meta={meta} index={index} />)}</div>
    </div>
  </section>;
}

"use client";
import { useState, useRef, useEffect } from "react";
import { api, fileUrl } from "@/lib/api";
import MathText from "@/components/MathText";
import { Button } from "@/components/ui/kit/button";
type Chapter = { id: string; title: string };
type Lesson = {
  theories: {
    id: string;
    title: string;
    content: string;
    imageKeys: string[];
  }[];
};
export default function TheoryReader({ chapters }: { chapters: Chapter[] }) {
  const [lesson, setLesson] = useState<Lesson | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const requestId = useRef(0);
  useEffect(
    () => () => {
      requestId.current += 1;
    },
    [],
  );
  async function open(id: string) {
    const currentRequest = ++requestId.current;
    setBusy(true);
    setError("");
    setLesson(null);
    try {
      const next = await api<Lesson>(`/lessons/${encodeURIComponent(id)}`);
      if (currentRequest === requestId.current) setLesson(next);
    } catch {
      if (currentRequest === requestId.current)
        setError(
          "Хичээл нээгдсэнгүй. Эрх, холболтоо шалгаад дахин оролдоно уу.",
        );
    } finally {
      if (currentRequest === requestId.current) setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <label className="block">
        Сэдэв
        <select
          className="mt-2 w-full min-h-11 rounded-lg border border-line bg-surface px-3"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) void open(e.target.value);
          }}
        >
          <option value="" disabled>
            Хичээл сонгох
          </option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </label>
      {busy && <div className="skeleton h-32 rounded-lg" />}
      {error && <p role="alert">{error}</p>}
      {lesson && !lesson.theories.length && (
        <p className="text-ink-dim">Энэ сэдэвт онол хараахан нэмээгүй.</p>
      )}
      {lesson?.theories.map((block) => (
        <details key={block.id} className="rounded-lg border border-line p-3">
          <summary className="min-h-11 cursor-pointer font-semibold">
            {block.title}
          </summary>
          <div className="space-y-3 mt-3">
            <MathText>{block.content}</MathText>
            {block.imageKeys.map((key) =>
              /\.pdf$/i.test(key) ? (
                <div key={key}>
                  <object
                    data={fileUrl(key)}
                    type="application/pdf"
                    className="w-full h-96"
                    aria-label={block.title}
                  >
                    <p>Утсан дээр баримтыг тусад нь нээж үзэж болно.</p>
                  </object>
                  <Button variant="link" asChild>
                    <a
                      href={fileUrl(key)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      PDF нээх
                    </a>
                  </Button>
                </div>
              ) : (
                <img
                  key={key}
                  src={fileUrl(key)}
                  alt={`${block.title} — тайлбар зураг`}
                  loading="lazy"
                  className="w-full rounded-lg"
                />
              ),
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

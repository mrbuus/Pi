"use client";

import { useCallback, useEffect, useState } from "react";

// API-д "устгагдсан жагсаалт харах" endpoint одоогоор байхгүй (бүх устгалт
// зөөлөн — deletedAt — гэхдээ listBooks/listChapters/listTopics/listProblems
// нь ЭРГЭЖ ХАРУУЛДАГГҮЙ). Тиймээс энэ хук нь тухайн хөтчөөс энэ CMS-ээр
// хийсэн устгалтуудыг localStorage-д бичиж, "Устгагдсан" toggle-д харуулна —
// зорилго нь зүгээр л устгасан зүйл "алга болов" биш "нуугдав" гэдгийг
// ажилтанд тодорхой харуулах явдал юм.

export type DeletedKind =
  | "book"
  | "chapter"
  | "topic"
  | "problem"
  | "video"
  | "test";

export interface DeletedEntry {
  id: string;
  kind: DeletedKind;
  label: string;
  detail?: string;
  deletedAt: string;
}

const KEY = "pimn:content-admin:deleted-log";
const MAX = 300;

function readLog(): DeletedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as DeletedEntry[]) : [];
  } catch {
    return [];
  }
}

function writeLog(entries: DeletedEntry[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)));
  } catch {
    /* localStorage дүүрсэн эсвэл хориглогдсон бол алгасна — критик биш */
  }
}

export function useDeletedLog() {
  const [entries, setEntries] = useState<DeletedEntry[]>([]);

  useEffect(() => {
    setEntries(readLog());
  }, []);

  const record = useCallback((entry: Omit<DeletedEntry, "deletedAt">) => {
    setEntries((prev) => {
      const next = [
        { ...entry, deletedAt: new Date().toISOString() },
        ...prev,
      ].slice(0, MAX);
      writeLog(next);
      return next;
    });
  }, []);

  const byKind = useCallback(
    (kind: DeletedKind) => entries.filter((e) => e.kind === kind),
    [entries],
  );

  return { record, byKind };
}

/** "2026-07-27 14:05" маягаар харуулна. */
export function formatDeletedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

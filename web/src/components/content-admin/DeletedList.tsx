"use client";

import { DeletedEntry, formatDeletedAt } from "./useDeletedLog";

interface DeletedListProps {
  entries: DeletedEntry[];
  emptyText: string;
}

// "Устгагдсан" toggle идэвхжсэн үед харагдах жагсаалт. Зөв ойлголт өгөх
// зорилготой тайлбар доор харагдана — устгал ЗӨӨЛӨН тул дата алга болоогүй,
// зөвхөн идэвхтэй жагсаалтаас нуугдсан гэдгийг тодотгоно.
export default function DeletedList({ entries, emptyText }: DeletedListProps) {
  return (
    <div className="mt-3 space-y-2 rounded-lg border border-dashed border-line bg-bg/50 p-3">
      <p className="text-xs text-ink-dim">
        Энэ хэсэг нь зөвхөн ТА энэ хөтчөөр устгасан зүйлсийг харуулна (зөөлөн
        устгал — өгөгдөл сервер дээр хадгалагдсаар байгаа, зөвхөн идэвхтэй
        жагсаалтаас нуугдсан).
      </p>
      {entries.length === 0 ? (
        <p className="text-sm text-ink-dim">{emptyText}</p>
      ) : (
        <ul className="space-y-1">
          {entries.map((e, i) => (
            <li
              key={`${e.id}-${e.deletedAt}-${i}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            >
              <span>
                <span className="text-error">✗</span> {e.label}
                {e.detail && (
                  <span className="ml-1 text-xs text-ink-dim">
                    — {e.detail}
                  </span>
                )}
              </span>
              <span className="text-xs text-ink-dim">
                {formatDeletedAt(e.deletedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

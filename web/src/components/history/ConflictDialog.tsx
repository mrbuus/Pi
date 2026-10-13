"use client";

import { RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/kit/button";
import { relativeTimeMn } from "@/lib/relativeTimeMn";
import type { VersionConflict } from "@/lib/revisions";
import HistoryDialog from "./HistoryDialog";

/**
 * 409 — «Таныг засаж байх хооронд Б. Баасанжав ижил хэсгийг өөрчилсөн: Зөв хариу».
 * Өөр хэсгүүдийн өөрчлөлтийг сервер өөрөө нэгтгэдэг (ZEREG-ZASVAR §2) — энэ цонх
 * зөвхөн яг ижил хэсгийг хоёулаа өөрөөр засвал гарна.
 * [Шинэчлэх] — сүүлийн хувилбарыг ачаална; [Миний хувилбарыг хадгалах] — зөрчилтэй
 * хэсэгт миний утга, бусдын бусад өөрчлөлт хэвээр (нөгөө хувилбар түүхэнд үлдэнэ).
 */
export default function ConflictDialog({
  conflict,
  busy = false,
  onReload,
  onOverwrite,
  onClose,
}: {
  conflict: VersionConflict | null;
  busy?: boolean;
  onReload: () => void;
  onOverwrite: () => void;
  onClose: () => void;
}) {
  return (
    <HistoryDialog
      open={!!conflict}
      onOpenChange={(o) => {
        if (!o && !busy) onClose();
      }}
      role="alertdialog"
      title="Өөр хүн өөрчилсөн байна"
      description={conflict?.message}
      footer={
        <>
          <Button variant="outline" type="button" disabled={busy} onClick={onReload}>
            <RefreshCw aria-hidden /> Шинэчлэх
          </Button>
          <Button type="button" disabled={busy} onClick={onOverwrite}>
            <Save aria-hidden /> Миний хувилбарыг хадгалах
          </Button>
        </>
      }
    >
      <div className="space-y-2 text-sm text-ink">
        {conflict?.changedAt && (
          <p className="text-ink-dim">Хадгалсан: {relativeTimeMn(conflict.changedAt)}</p>
        )}
        <p>
          <span className="font-semibold">Шинэчлэх</span> — сүүлд хадгалсан хувилбарыг ачаална. Таны хадгалаагүй
          өөрчлөлт устна.
        </p>
        <p>
          <span className="font-semibold">Миний хувилбарыг хадгалах</span> —{" "}
          {conflict?.fields.length
            ? "зөрчилтэй хэсэгт таны утга хадгалагдана; нөгөө хүний бусад өөрчлөлт хэвээр үлдэнэ."
            : "таны засвар хадгалагдана."}{" "}
          Нөгөө хувилбар «Түүх»-д үлдэх тул хэрэгтэй бол буцааж болно.
        </p>
      </div>
    </HistoryDialog>
  );
}

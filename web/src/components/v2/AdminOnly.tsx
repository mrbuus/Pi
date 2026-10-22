"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { LoadingState } from "@/components/ui/StateBlock";
import { getRole } from "@/lib/api";

const subscribe = () => () => {};
const SERVER = "__server__";

/**
 * Эрхийн матриц болон хөгжүүлэлтийн хяналтын хуудсыг ЗӨВХӨН админд харуулна.
 *
 * Жинхэнэ хамгаалалт сервер талд (`/staff-capabilities` ба
 * `/users/:id/staff-role` нь Roles(ADMIN)); энэ бол URL-аар орсон Багш, Багш+-д
 * хуудас, өгөгдөл ачаалахгүй байлгах клиент талын хаалт. SSR үед role үл мэдэгдэх
 * тул `useSyncExternalStore`-оор hydration зөрөхгүйгээр шалгана.
 */
export default function AdminOnly({ children }: { children: ReactNode }) {
  const role = useSyncExternalStore<string | null>(subscribe, getRole, () => SERVER);
  if (role === SERVER) return <LoadingState rows={4} label="Эрхийг шалгаж байна" />;
  if (role !== "ADMIN") {
    return (
      <div
        role="alert"
        className="mx-auto mt-10 flex max-w-md flex-col items-center gap-2 rounded-2xl border border-line bg-surface p-8 text-center"
      >
        <ShieldAlert className="size-7 text-ink-dim" aria-hidden />
        <p className="text-lg font-semibold text-ink">Хандах эрхгүй байна</p>
        <p className="text-sm text-ink-dim">Энэ хуудас зөвхөн админд нээлттэй</p>
      </div>
    );
  }
  return <>{children}</>;
}

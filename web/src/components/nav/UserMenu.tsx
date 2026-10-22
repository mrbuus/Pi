"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LogOut } from "lucide-react";
import { fileUrl } from "@/lib/api";
import { staffName } from "@/lib/personName";
import { NavIcon } from "./icons";
import { PERSONAL_LINKS } from "./nav-data";

export interface UserMenuMe {
  firstName: string;
  lastName: string;
  /** Багш+ бол нэрийн ард «+» */
  role?: string | null;
  avatarUrl?: string | null;
  studentCode?: string | null;
  teacherCode?: string | null;
}

/**
 * Баруун дээд булангийн хэрэглэгчийн цэс (эзэн 2026-10-13): хувийн бүх зүйл —
 * миний мэдээлэл, мэдэгдэл, тусламж, санал, нууцлал, гарах — энд нэг дор.
 */
export default function UserMenu({
  me,
  roleLabel,
  extra,
  onLogout,
}: {
  me: UserMenuMe | null;
  roleLabel: string;
  extra?: string;
  onLogout: () => void;
}) {
  const name = me ? staffName(me) : "";
  const initials = me ? `${me.lastName?.trim()[0] ?? ""}${me.firstName?.trim()[0] ?? ""}`.toUpperCase() : "";
  const code = me?.studentCode || me?.teacherCode;
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={`Хэрэглэгчийн цэс${name ? ` — ${name}` : ""}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full outline-offset-2 transition hover:bg-panel"
      >
        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-brand-bright/15 text-[11px] font-bold text-brand-soft ring-1 ring-line">
          {me?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl(me.avatarUrl)} alt="" className="h-full w-full object-cover" />
          ) : (
            initials || <NavIcon name="user" className="h-4 w-4" />
          )}
        </span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="elev-3 z-50 w-64 rounded-xl border border-line bg-surface p-1.5 text-sm text-ink"
        >
          <div className="px-3 py-2.5">
            <p className="font-bold">{name}</p>
            <p className="text-xs text-ink-dim">
              {roleLabel}
              {code ? ` — ${code}` : ""}
              {extra ? ` — ${extra}` : ""}
            </p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          {PERSONAL_LINKS.map((l) => (
            <DropdownMenu.Item key={l.href} asChild>
              <Link
                href={l.href}
                className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-3 outline-none data-[highlighted]:bg-panel"
              >
                <NavIcon name={l.icon} className="h-4 w-4 text-ink-dim" />
                {l.label}
              </Link>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item
            onSelect={onLogout}
            className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-ink-dim outline-none data-[highlighted]:bg-panel data-[highlighted]:text-ink"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Гарах
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

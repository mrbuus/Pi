"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { apiUrl, getToken } from "@/lib/api";

/* ============================================================================
 * Хэрэглээний бүртгэл (эзэн 2026-11-04): аль хуудас нээгдэж, аль товч дарагдаж
 * байгааг өөрийн сан руу багцлан илгээнэ. Нэр, хариу, оноо, хайлтын үг ОГТ
 * илгээхгүй — товчийг зөвхөн:
 *   1) ойрын `data-track` (кодонд бичсэн тогтмол шошго),
 *   2) холбоосын зам (`/app/...`, ID-г «:id» болгоно),
 *   3) lucide дүрсний нэр (`lucide-laptop` → `icon:laptop`)
 * гэсэн гурвын аль нэгээр тэмдэглэнэ. Аль нь ч үгүй товшилтыг алгасна.
 * Сервер ч мөн дахин цэвэрлэнэ (api/src/usage/usage-normalize.ts).
 * ========================================================================== */

type UsageEvent = { kind: "page" | "click"; path: string; target?: string };

const FLUSH_MS = 20_000;
const MAX_BATCH = 50;
const ID_SEGMENT =
  /^(c[a-z0-9]{20,}|[0-9a-f]{8}-[0-9a-f-]{27,}|\d+|(?=[A-Za-z_-]*\d)[A-Za-z0-9_-]{16,}|\d{4}-\d{2}-\d{2})$/;

function cleanPath(path: string): string {
  return (
    "/" +
    path
      .split(/[?#]/)[0]
      .split("/")
      .filter(Boolean)
      .map((s) => (ID_SEGMENT.test(s) ? ":id" : s))
      .join("/")
  );
}

function device(): "mobile" | "tablet" | "desktop" {
  const w = window.innerWidth;
  return w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop";
}

function targetOf(el: Element): string | null {
  const tracked = el.closest("[data-track]")?.getAttribute("data-track");
  if (tracked) return `track:${tracked}`;
  if (el instanceof HTMLAnchorElement) {
    const href = el.getAttribute("href") ?? "";
    if (href.startsWith("/")) return `link:${cleanPath(href)}`;
  }
  const icon = el.querySelector("svg.lucide");
  const name = icon ? [...icon.classList].find((c) => c.startsWith("lucide-")) : undefined;
  return name ? `icon:${name.slice("lucide-".length)}` : null;
}

let queue: UsageEvent[] = [];
// Дараалал аль хэрэглэгчийнх вэ. Нэг утсан дээр гараад өөр хүн нэвтэрвэл өмнөхийн
// үлдсэн үйлдлийг шинэ хүний нэрээр илгээхгүй — хаяна.
let queueToken: string | null = null;

function flush(keepalive = false) {
  const token = getToken();
  if (token !== queueToken) queue = [];
  if (!queue.length || !token) return;
  const events = queue.splice(0, MAX_BATCH);
  // api() keepalive дэмждэггүй тул хуудас хаагдах үед ч хүрэх шууд fetch (бүтэн хаяг — apiUrl).
  fetch(apiUrl("/usage"), {
    method: "POST",
    keepalive,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ device: device(), events }),
  }).catch(() => {
    /* бүртгэл бол туслах мэдээлэл — алдаа хэрэглэгчид харагдахгүй */
  });
}

function push(e: UsageEvent) {
  const token = getToken();
  if (token !== queueToken) {
    queue = [];
    queueToken = token;
  }
  queue.push(e);
  if (queue.length >= MAX_BATCH) flush();
}

export default function UsageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // «/app» нь эрхийн нүүр рүү шууд шилжүүлдэг — хуудас биш
    if (pathname !== "/app") push({ kind: "page", path: cleanPath(pathname) });
  }, [pathname]);

  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      const el = (ev.target as Element | null)?.closest?.("a,button,[role=button],[data-track]");
      if (!el) return;
      const target = targetOf(el);
      if (target) push({ kind: "click", path: cleanPath(window.location.pathname), target });
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") flush(true);
    };
    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("visibilitychange", onHide);
    const timer = window.setInterval(() => flush(), FLUSH_MS);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("visibilitychange", onHide);
      window.clearInterval(timer);
      flush(true);
    };
  }, []);

  return null;
}

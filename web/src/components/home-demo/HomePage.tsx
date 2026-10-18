"use client";
// Туршилтын нүүр (/demo/home) — docs/v2/hero/demo мокап, port_home.py --demo. Үндсэн нүүр: components/home

import katex from "katex";
import "katex/dist/katex.min.css";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/hooks/useAuth";
import { homeForRole } from "@/lib/api";
import HeroStill from "./HeroStill";
import { MARKUP } from "./markup";
import "./home.css";

// Нүүр хуудас = docs/v2/hero/home мокап (волейболгүй). Markup/CSS/JS нь
// port_home.py-гээр үүсгэгддэг; энэ файл зөвхөн тэдгээрийг холбоно:
//   1. MARKUP-ийг серверээс шууд рендерлэнэ (эхний зураг JS-гүй гарна)
//   2. dom.ts — гүйлгэлт, цэс, сувгууд, «Он оноор» (үргэлж)
//   3. three.ts — 3D тайзууд (three.js, тусдаа chunk). Өгөгдөл хэмнэх горим,
//      2G, WebGL-гүй үед татахгүй: hero-д статик куб, лаборатори нуугдана.

function canRender3D() {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData || /2g$/.test(conn?.effectiveType ?? "")) return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

// 3D-гүй үед hero-гийн карт статик кубтэй таарна
function showStillTag(root: HTMLElement) {
  const q = (s: string) => root.querySelector<HTMLElement>(s);
  const next = q("#tNext"), name = q("#tName"), fx = q("#tFx"), lab = q("#lab");
  if (next) next.hidden = true;
  if (name) name.textContent = "Куб";
  if (fx) {
    fx.replaceChildren();
    for (const f of ["V=a^3", "S=6a^2", "d=a\\sqrt{3}"]) {
      const s = document.createElement("span");
      katex.render(f, s, { throwOnError: false });
      fx.appendChild(s);
    }
  }
  root.querySelector(".tag .go2")?.remove();
  if (lab) lab.hidden = true; // огтлолын лаборатори 3D-гүйгээр ажиллахгүй
}

export default function DemoHomePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [stillHost, setStillHost] = useState<HTMLElement | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const root = rootRef.current!;
    let dead = false, offDom: (() => void) | undefined, offThree: (() => void) | undefined;
    const fallBack = () => {
      if (dead) return;
      showStillTag(root);
      setStillHost(root.querySelector<HTMLElement>("#heroView"));
    };
    (async () => {
      const { mountDom } = await import("./dom");
      if (dead) return;
      offDom = mountDom(root);
      if (!canRender3D()) return fallBack();
      try {
        const { mountThree } = await import("./three");
        if (dead) return;
        offThree = mountThree(root);
      } catch {
        fallBack();
      }
    })().catch(fallBack);
    return () => {
      dead = true; offThree?.(); offDom?.();
      // dom.ts нь markup-ийг өөрчилдөг (үгс задлах, ном нэмэх) — дахин холбогдоход цэвэр эх хэрэгтэй
      if (offDom) { root.innerHTML = MARKUP; root.classList.remove("ready"); }
    };
  }, []);

  // Нэвтэрсэн хэрэглэгчид «Нэвтрэх»-ийн оронд өөрийн хэсэг рүү
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !user) return;
    const home = homeForRole(user.role ?? "STUDENT");
    root.querySelectorAll<HTMLAnchorElement>('a[href="/login"]').forEach((a) => {
      a.href = home;
      if (a.firstChild?.nodeType === Node.TEXT_NODE) a.firstChild.textContent = "Миний хэсэг";
      if (a.hasAttribute("aria-label")) a.setAttribute("aria-label", "Миний хэсэг");
    });
    root.querySelectorAll<HTMLElement>('a[href="/register"]').forEach((a) => { a.style.display = "none"; }); // .btn-ийн display нь hidden-ийг дардаг
  }, [user]);

  return (
    <>
      <div ref={rootRef} className="sied" dangerouslySetInnerHTML={{ __html: MARKUP }} />
      {stillHost && createPortal(<HeroStill />, stillHost)}
    </>
  );
}

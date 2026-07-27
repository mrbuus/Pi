"use client";

import { useEffect, useRef, useState } from "react";

/**
 * `.reveal` класстай элементүүдийг үзэгдэх мужид ороход нь `.visible`
 * класс нэмж, эргэлдэн харагдуулна. Landing.tsx-ийн эх бие дотор нэг л
 * удаа дуудагдана — доош гүйлгэхэд аль хэдийн өнгөрсөн хэсгүүдийг ч
 * шууд ил гаргана (буцаж дээшлэхэд дахин анимацлагдахгүй байхын тулд).
 */
export function useReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting || e.boundingClientRect.top < 0) {
            e.target.classList.add("visible");
          }
        }),
      { threshold: 0.12 },
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

/** Тоо 0-оос эхлээд зорилтот утга хүртэл өсөж харагдах статистикийн тоолуур. */
export function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && setStarted(true),
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!started || !ref.current) return;
    const start = performance.now();
    const dur = 1600;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      if (ref.current) {
        ref.current.textContent =
          (to * eased).toLocaleString("en-US", {
            maximumFractionDigits: p === 1 ? 1 : 0,
          }) + (p === 1 ? suffix : "");
      }
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, to, suffix]);
  return <span ref={ref}>0</span>;
}

"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import LogoMark from "./LogoMark";

const Hero3D = dynamic(() => import("./Hero3D"), { ssr: false });

function useReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          // Доош үсэрсэн үед аль хэдийн өнгөрсөн хэсгүүдийг ч ил гаргана
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

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
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
          Math.round(to * eased).toLocaleString() + (p === 1 ? suffix : "");
      }
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, to, suffix]);
  return <span ref={ref}>0</span>;
}

// Жишээ зурган дээрх шиг гялалзсан цэгэн progress bar
function ShimmerBar({ progress = 0.62 }: { progress?: number }) {
  const cells = 28;
  const lit = Math.round(cells * progress);
  return (
    <div className="flex items-center gap-[5px] rounded-full bg-[#0d1733] px-3 py-2.5 border border-white/5">
      {Array.from({ length: cells }).map((_, i) => (
        <span
          key={i}
          className={`h-2.5 min-w-0 flex-1 rounded-[4px] ${
            i < lit ? "shimmer-cell bg-[#8ea4e8]" : "bg-white/10"
          }`}
          style={{ ["--d" as string]: `${(i % 9) * 0.18}s` }}
        />
      ))}
      <span className="ml-1 h-5 w-7 rounded-lg bg-[#ece9ff] glow-pulse" />
    </div>
  );
}

const FLOATING = [
  { sym: "π", top: "12%", left: "6%", size: 38, delay: "0s", rot: "-8deg" },
  { sym: "∫", top: "30%", left: "92%", size: 44, delay: "1.2s", rot: "6deg" },
  { sym: "Σ", top: "68%", left: "4%", size: 34, delay: "2.1s", rot: "10deg" },
  { sym: "√", top: "80%", left: "88%", size: 40, delay: "0.7s", rot: "-12deg" },
  { sym: "θ", top: "8%", left: "78%", size: 30, delay: "1.8s", rot: "4deg" },
  { sym: "∞", top: "55%", left: "95%", size: 36, delay: "2.6s", rot: "-5deg" },
];

const LEVELS = [
  {
    title: "Тоо тоолол",
    sub: "12/12 бодлого · дууссан",
    state: "done" as const,
  },
  {
    title: "Бутархай",
    sub: "9/14 бодлого · үргэлжилж байна",
    state: "active" as const,
    progress: 9 / 14,
  },
  { title: "Тэгшитгэл", sub: "Эрх нээгдээгүй", state: "locked" as const },
  { title: "Геометр", sub: "Эрх нээгдээгүй", state: "locked" as const },
];

const BOOKS = [
  { code: "100×100", desc: "Суурь түвшний 100 сэдэв", accent: "#4f7fe6" },
  { code: "200×200", desc: "Ахисан түвшний бодлогууд", accent: "#7c5fe6" },
  { code: "300×300", desc: "ЭЕШ-ийн өндөр түвшин", accent: "#34d6a8" },
  { code: "П-тест", desc: "11 цуврал жишиг тест", accent: "#e8c468" },
];

const ADAPTIVE = [
  {
    icon: "✓",
    title: "Орой бүр тэмдэглэ",
    text: "Бодсон бодлого бүрээ 4 төлөвөөр тэмдэглэнэ: алдаагүй, алдаад зассан, алдсан, буудсан.",
  },
  {
    icon: "ƒ",
    title: "Систем чамаас суралцана",
    text: "Сэдэв, бодох арга, томьёо бүрээр чиний алдааны хэв маягийг урт хугацаанд шинжилнэ.",
  },
  {
    icon: "π",
    title: "Яг хэрэгтэйг чинь өгнө",
    text: "ЭЕШ-д яг юу бэлдэхийг сэдэв сэдвээр нь зааж, авах онооны мужийг чинь таамаглана.",
  },
];

export default function Landing() {
  useReveal();
  return (
    <main className="relative">
      {/* Navbar */}
      <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#060c1d]/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5">
          <a href="#" className="flex items-center gap-2.5">
            <LogoMark size={34} />
            <span className="text-lg font-extrabold tracking-tight">
              Pi<span className="text-brand-bright">.mn</span>
            </span>
          </a>
          <div className="ml-auto hidden items-center gap-7 text-sm font-medium text-ink-dim md:flex">
            <a href="#levels" className="transition hover:text-ink">
              Бодлогын сан
            </a>
            <a href="#books" className="transition hover:text-ink">
              Ном
            </a>
            <a href="#adaptive" className="transition hover:text-ink">
              Адаптив систем
            </a>
          </div>
          <a
            href="/login"
            className="rounded-full bg-brand-bright px-5 py-2 text-sm font-bold text-white transition hover:bg-[#6190f0]"
          >
            Нэвтрэх
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div aria-hidden className="grid-bg pointer-events-none absolute inset-0" />
        {FLOATING.map((f) => (
          <span
            key={f.sym + f.top}
            aria-hidden
            className="float-sym pointer-events-none absolute select-none font-serif text-brand-soft/25"
            style={{
              top: f.top,
              left: f.left,
              fontSize: f.size,
              ["--delay" as string]: f.delay,
              ["--rot" as string]: f.rot,
            }}
          >
            {f.sym}
          </span>
        ))}

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <span className="reveal visible inline-flex items-center gap-2 rounded-full border border-brand-bright/30 bg-brand-bright/10 px-4 py-1.5 text-[13px] font-semibold text-brand-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
              Шинэ ирээдүйн эзэд сургалтын төв
            </span>
            <h1 className="mt-6 text-[34px] font-extrabold leading-[1.12] tracking-tight sm:text-[42px] md:text-[58px]">
              Математикт <span className="text-shine">π шиг төгсгөлгүй</span>{" "}
              ахиц
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-dim">
              Алдаа бүрээс чинь суралцаж, яг хэрэгтэй бодлогыг чинь сэдэв
              сэдвээр нь олж өгдөг адаптив систем. Чи зөвхөн бод — зам чинь
              өөрөө зурагдана.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="/login"
                className="glow-pulse rounded-full bg-brand-bright px-7 py-3.5 font-bold text-white transition hover:scale-[1.03]"
              >
                Үнэгүй эхлэх
              </a>
              <a
                href="#books"
                className="rounded-full border border-white/15 px-7 py-3.5 font-semibold text-ink transition hover:border-white/40"
              >
                Бодлогын сан үзэх
              </a>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-10 gap-y-6">
              <div>
                <p className="text-3xl font-extrabold">
                  <Counter to={800} suffix="+" />
                </p>
                <p className="mt-1 text-sm text-ink-dim">танхимын сурагч</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold">
                  <Counter to={10000} suffix="+" />
                </p>
                <p className="mt-1 text-sm text-ink-dim">бодлогын сан</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold">
                  <Counter to={11} />
                </p>
                <p className="mt-1 text-sm text-ink-dim">цуврал ном</p>
              </div>
            </div>
          </div>

          <div className="relative h-[380px] md:h-[460px]">
            <Hero3D />
            <p className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-xs text-ink-dim/60">
              Хулганаар эргүүлж үзээрэй
            </p>
          </div>
        </div>

        <div className="relative mx-auto mt-14 max-w-md px-5">
          <ShimmerBar />
        </div>
      </section>

      {/* Levels — тоглоомын түвшин */}
      <section id="levels" className="relative py-24">
        <div className="mx-auto max-w-6xl px-5">
          <p className="reveal text-sm font-bold uppercase tracking-[0.2em] text-brand-bright">
            Бодлогын сан
          </p>
          <h2 className="reveal mt-3 max-w-xl text-3xl font-extrabold md:text-4xl">
            Бүлэг сэдвүүд тоглоомын түвшин шиг нээгдэнэ
          </h2>
          <p className="reveal mt-4 max-w-xl text-ink-dim">
            Ном бүтнээрээ нээгдэхгүй — сэдэв бүрийг эзэмшээд дараагийн түвшин рүү.
            Бүлэг бүрийн эхний онол, тест нь үнэгүй.
          </p>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {LEVELS.map((lv, i) => (
              <div
                key={lv.title}
                className={`reveal flex items-center gap-5 rounded-2xl border p-6 transition ${
                  lv.state === "active"
                    ? "border-brand-bright/60 bg-brand-bright/10"
                    : lv.state === "done"
                      ? "border-teal-400/30 bg-teal-400/5"
                      : "border-white/8 bg-white/[0.03] opacity-70"
                }`}
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-extrabold ${
                    lv.state === "done"
                      ? "bg-teal-400/20 text-teal-300"
                      : lv.state === "active"
                        ? "bg-brand-bright/25 text-brand-soft"
                        : "bg-white/5 text-ink-dim"
                  }`}
                >
                  {lv.state === "done" ? "✓" : lv.state === "active" ? "▶" : "🔒"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold">{lv.title}</p>
                  <p className="mt-0.5 text-sm text-ink-dim">{lv.sub}</p>
                  {lv.state === "active" && (
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="bar-fill h-full rounded-full bg-gradient-to-r from-brand-bright to-brand-soft"
                        style={{ width: `${(lv.progress ?? 0) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Books */}
      <section id="books" className="relative py-24">
        <div className="mx-auto max-w-6xl px-5">
          <p className="reveal text-sm font-bold uppercase tracking-[0.2em] text-brand-bright">
            Номын сан
          </p>
          <h2 className="reveal mt-3 text-3xl font-extrabold md:text-4xl">
            Олон жилийн шилмэл бодлогууд — цахим хэлбэрээр
          </h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BOOKS.map((b, i) => (
              <div
                key={b.code}
                className="reveal group relative overflow-hidden rounded-2xl border border-white/8 bg-panel p-6 transition hover:-translate-y-1.5 hover:border-white/20"
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                <div
                  className="absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-15 blur-2xl transition group-hover:opacity-40"
                  style={{ background: b.accent }}
                />
                <p
                  className="font-serif text-4xl font-bold"
                  style={{ color: b.accent }}
                >
                  {b.code}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink-dim">
                  {b.desc}
                </p>
                <p className="mt-6 text-xs font-semibold text-brand-soft/70">
                  Сэдэв бүрээр нээгдэнэ →
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Adaptive */}
      <section id="adaptive" className="relative py-24">
        <div aria-hidden className="grid-bg pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-5">
          <p className="reveal text-sm font-bold uppercase tracking-[0.2em] text-brand-bright">
            Адаптив систем
          </p>
          <h2 className="reveal mt-3 max-w-2xl text-3xl font-extrabold md:text-4xl">
            Social media чиний сонирхлыг таньдаг шиг — бид чиний{" "}
            <span className="text-shine">математикийг</span> таньдаг
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {ADAPTIVE.map((a, i) => (
              <div
                key={a.title}
                className="reveal rounded-2xl border border-white/8 bg-panel/80 p-7"
                style={{ transitionDelay: `${i * 110}ms` }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-bright/15 font-serif text-2xl font-bold text-brand-soft">
                  {a.icon}
                </div>
                <p className="mt-5 text-lg font-bold">{a.title}</p>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-dim">
                  {a.text}
                </p>
              </div>
            ))}
          </div>
          <div className="reveal mx-auto mt-14 max-w-2xl rounded-2xl border border-brand-bright/25 bg-brand-bright/8 p-6 text-center">
            <p className="font-serif text-lg italic text-brand-soft">
              «Чи тригонометрийн илэрхийлэл дээр алдах магадлал өндөр байна —
              эхлээд энэ 5 бодлогыг бод. Одоогийн түвшингээр ЭЕШ-д 640–700
              оноо авах мужид явна.»
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-ink-dim">
              — Системийн жишээ зөвлөмж
            </p>
          </div>
        </div>
      </section>

      {/* CTA + Footer */}
      <section className="relative py-20">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h2 className="reveal text-3xl font-extrabold md:text-4xl">
            Ирээдүйн эзэн болоход <span className="text-shine">√∞</span> алхам
          </h2>
          <a
            href="/login"
            className="reveal glow-pulse mt-8 inline-block rounded-full bg-brand-bright px-9 py-4 text-lg font-bold text-white transition hover:scale-[1.03]"
          >
            Үнэгүй эхлэх
          </a>
        </div>
      </section>
      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 text-sm text-ink-dim">
          <div className="flex items-center gap-2.5">
            <LogoMark size={26} />
            <span>© 2026 Шинэ ирээдүйн эзэд сургалтын төв</span>
          </div>
          <span className="font-serif">π ≈ 3.14159 · ∞</span>
        </div>
      </footer>
    </main>
  );
}

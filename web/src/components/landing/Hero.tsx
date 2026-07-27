"use client";

import dynamic from "next/dynamic";
import LeadForm from "./LeadForm";

const Hero3D = dynamic(() => import("@/components/Hero3D"), { ssr: false });

const FLOATING = [
  { sym: "π", top: "12%", left: "6%", size: 38, delay: "0s", rot: "-8deg" },
  { sym: "∫", top: "30%", left: "92%", size: 44, delay: "1.2s", rot: "6deg" },
  { sym: "Σ", top: "68%", left: "4%", size: 34, delay: "2.1s", rot: "10deg" },
  { sym: "√", top: "80%", left: "88%", size: 40, delay: "0.7s", rot: "-12deg" },
  { sym: "θ", top: "8%", left: "78%", size: 30, delay: "1.8s", rot: "4deg" },
  { sym: "∞", top: "55%", left: "95%", size: 36, delay: "2.6s", rot: "-5deg" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20">
      <div aria-hidden className="grid-bg pointer-events-none absolute inset-0" />
      {FLOATING.map((f) => (
        <span
          key={f.sym + f.top}
          aria-hidden
          className="float-sym pointer-events-none absolute select-none font-serif text-brand-soft/40"
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
        {/* min-w-0: grid багана контентоосоо (ялангуяа canvas) томрохгүй */}
        <div className="min-w-0">
          <span className="reveal visible inline-flex items-center gap-2 rounded-full border border-brand-bright/30 bg-brand-bright/10 px-4 py-1.5 text-[13px] font-semibold text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-teal" />
            Шинэ ирээдүйн эзэд сургалтын төв
          </span>
          <h1 className="mt-6 text-[32px] font-extrabold leading-[1.15] tracking-tight sm:text-[40px] md:text-[52px]">
            Элсэлтийн шалгалтад бэлдэх{" "}
            <span className="text-shine">хамгийн үр дүнтэй</span> арга
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-dim">
            Математик болон Нийгмийн ухаанд төвлөрсөн, дадлагажуулах
            системтэй бэлтгэл төв.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#hero-lead-form"
              className="glow-pulse rounded-full bg-brand-bright px-7 py-3.5 text-center font-bold text-on-brand transition hover:opacity-95"
            >
              Үнэгүй түвшин тогтоох тест өгөх
            </a>
            <a
              href="#branches"
              className="rounded-full border border-line px-7 py-3.5 font-semibold text-ink transition hover:border-brand"
            >
              Элсэлтийн мэдээлэл авах
            </a>
          </div>
        </div>

        <div className="relative min-w-0 h-[340px] md:h-[420px]">
          <Hero3D />
        </div>
      </div>

      <div className="relative mx-auto mt-14 max-w-xl px-5">
        <LeadForm id="hero-lead-form" />
      </div>
    </section>
  );
}

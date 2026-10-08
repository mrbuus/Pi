"use client";

import { useEffect, useRef } from "react";

import Achievements from "./landing/Achievements";
import Branches from "./landing/Branches";
import CentreInfo from "./landing/CentreInfo";
import Footer from "./landing/Footer";
import Hero from "./landing/Hero";
import HowItWorks from "./landing/HowItWorks";
import Nav from "./landing/Nav";
import styles from "./landing/landing.module.css";
import Subjects from "./landing/Subjects";
import Tuition from "./landing/Tuition";
import TrustBar from "./landing/TrustBar";

// Нийтийн нүүр хуудас — олон улсын жишиг (Khan Academy, Brilliant, Coursera,
// UWorld, Magoosh) дэх нэгдсэн бүтэц: hero → итгэлийн тоо → хичээлүүд →
// амжилт → үйл явц → салбар → төлбөр → холбоо барих.
export default function Landing() {
  const container = useRef<HTMLElement>(null);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches || !("IntersectionObserver" in window)) return;
    const root = container.current;
    if (!root) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("landing-reveal");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12 });
    root.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return (
    <main ref={container} id="landing-content" className={`relative ${styles.page}`}>
      <a href="#subjects" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-surface focus:p-3">Хичээлүүд рүү шилжих</a>
      <Nav />
      <Hero />
      <TrustBar />
      <Subjects />
      <Achievements />
      <HowItWorks />
      <CentreInfo />
      <Branches />
      <Tuition />
      <Footer />
    </main>
  );
}

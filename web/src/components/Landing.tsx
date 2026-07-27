"use client";

import Achievements from "./landing/Achievements";
import Branches from "./landing/Branches";
import Footer from "./landing/Footer";
import Hero from "./landing/Hero";
import HowItWorks from "./landing/HowItWorks";
import Nav from "./landing/Nav";
import { useReveal } from "./landing/shared";
import Subjects from "./landing/Subjects";
import Tuition from "./landing/Tuition";
import TrustBar from "./landing/TrustBar";

// Нийтийн нүүр хуудас — олон улсын жишиг (Khan Academy, Brilliant, Coursera,
// UWorld, Magoosh) дэх нэгдсэн бүтэц: hero → итгэлийн тоо → хичээлүүд →
// амжилт → үйл явц → салбар → төлбөр → холбоо барих.
export default function Landing() {
  useReveal();
  return (
    <main className="relative">
      <Nav />
      <Hero />
      <TrustBar />
      <Subjects />
      <Achievements />
      <HowItWorks />
      <Branches />
      <Tuition />
      <Footer />
    </main>
  );
}

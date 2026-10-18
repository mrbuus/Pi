import type { Metadata } from "next";
import DemoHomePage from "@/components/home-demo/HomePage";

// Нүүр хуудасны туршилтын хувилбар — үндсэн нүүр (/) хөндөгдөхгүй
export const metadata: Metadata = { title: "Нүүр (туршилт)", robots: { index: false, follow: false } };

export default function DemoHome() {
  return <DemoHomePage />;
}

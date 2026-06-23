import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pi.mn — Шинэ ирээдүйн эзэд",
  description:
    "Математикт π шиг төгсгөлгүй ахиц. Алдаа бүрээс чинь суралцаж, яг хэрэгтэй бодлогыг чинь олж өгдөг адаптив систем.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

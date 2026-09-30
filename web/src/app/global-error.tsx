"use client";
import "./globals.css";
import ErrorPage from "./error";

export default function GlobalError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="mn"><body className="min-h-screen bg-bg px-4 py-8 text-ink"><title>Алдаа гарлаа</title><ErrorPage {...props} /></body></html>;
}

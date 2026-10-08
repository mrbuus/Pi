"use client";

import { Link2 } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";

/**
 * Google account холбоход browser API руу шилжинэ. Энэ endpoint нь JWT-ийг
 * header-аар авч, хэрэглэгчид харьяалагдах богино настай OAuth state үүсгэдэг.
 */
export default function GoogleAccountSection({
  connectedEmail,
  onStarted,
}: {
  connectedEmail?: string;
  onStarted: (url: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function connect() {
    setLoading(true);
    setError("");
    try {
      const { url } = await api<{ url: string }>("/auth/google/link", {
        method: "POST",
      });
      onStarted(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Google account холбож чадсангүй",
      );
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-panel text-ink-dim">
          <Link2 className="h-4 w-4" aria-hidden="true" strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-ink">Google account</h2>
          {connectedEmail ? (
            <p className="mt-1 break-all text-sm text-ink-dim">
              Холбогдсон:{" "}
              <span className="font-medium text-ink">{connectedEmail}</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink-dim">
              Холбовол Google-ээр Pi.mn account руугаа нэвтэрч болно.
            </p>
          )}
        </div>
      </div>

      {!connectedEmail && (
        <button
          type="button"
          onClick={connect}
          disabled={loading}
          className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-panel disabled:opacity-50"
        >
          <Link2 className="h-4 w-4" aria-hidden="true" strokeWidth={1.7} />
          {loading ? "Google рүү шилжиж байна" : "Google account холбох"}
        </button>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-error">
          {error}
        </p>
      )}
    </section>
  );
}

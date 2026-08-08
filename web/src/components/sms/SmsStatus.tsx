"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, SectionHeader } from "@/components/ui/Surface";
import { api } from "@/lib/api";
import { LoadingState, ErrorState } from "@/components/ui/StateBlock";
import { Meta } from "@/components/ui/Meta";
import InfoHint from "@/components/ui/InfoHint";
import { Button } from "@/components/ui/Button";

interface SmsStatus {
  configured: boolean;
  provider: string | null;
  messagesSentThisMonth: number;
  estimatedCostTug: number;
}

export function SmsStatus() {
  const [status, setStatus] = useState<SmsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      // api() нь суурь хаяг + эрхийн толгойг өөрөө нэмнэ. Түүхий fetch("/api/…")
      // нь ХАРЬЦАНГУЙ зам тул прод дээр (вэб Vercel, API Render) 404 болно.
      setStatus(await api<SmsStatus>("/sms/status"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (loading) return <LoadingState rows={3} label="Төлөвийг ачаалж байна" />;
  if (error) return <ErrorState message={error} onRetry={fetchStatus} />;
  if (!status) return null;

  return (
    <div className="space-y-4">
      {/* Нийлүүлэгчийн төлөв */}
      <Card className={status.configured ? "border-success/30 bg-success/5" : "border-error/30 bg-error/5"}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {status.configured ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0 text-error" aria-hidden />
            )}
            <div>
              <h3 className={`font-bold ${status.configured ? "text-success" : "text-error"}`}>
                {status.configured ? "SMS илгээлтийг идэвхтэй" : "SMS илгээлт тохируулаагүй"}
              </h3>
              <p className="mt-1 text-sm text-ink-dim">
                {status.configured ? (
                  <>
                    Нийлүүлэгч: <span className="font-mono font-semibold">{status.provider}</span>
                  </>
                ) : (
                  <>
                    Сервер администратор нь SMS нийлүүлэгчийн нээлэл аргыг тохируулаагүй байна. Өмнө нь
                    дугаарлуу мессеж явуулах боломжгүй болно.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Сард явсан мессеж */}
      {status.configured && (
        <Card>
          <SectionHeader
            title="Энэ сард явсан мессеж"
            hint={
              <InfoHint>
                Сағалгүй сарын эхнээс өнөөний өнгөрөө явсан бүх SMS-ийн тоо ба ойролцоо
                хөлс нүүлгэлтийн үнэ. SMS нь өртөгтэй, буцаах боломжгүй — анхаарал сүүлийнхээр.
              </InfoHint>
            }
          />
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-ink-dim">Мессежийн тоо:</span>
              <span className="font-bold text-2xl">{status.messagesSentThisMonth.toLocaleString("mn-MN")}</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <span className="text-ink-dim">Ойролцоо зардал:</span>
              <span className="font-bold text-xl">
                ₮{status.estimatedCostTug.toLocaleString("mn-MN")}
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

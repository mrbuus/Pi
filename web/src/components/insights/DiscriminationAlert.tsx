"use client";

import { Card, SectionHeader } from "@/components/ui/Surface";
import type { ProblemStats } from "./types";
import { AlertTriangle } from "lucide-react";
import InfoHint from "@/components/ui/InfoHint";

interface DiscriminationAlertProps {
  problems: ProblemStats[];
}

export default function DiscriminationAlert({
  problems,
}: DiscriminationAlertProps) {
  // Ялгаа сөргүү бодлого олно (discrimination-и 0.3-аас доош)
  const problematic = problems.filter(
    (p) =>
      p.discrimination === "bad" ||
      p.discrimination === "poor" ||
      Math.abs(p.pointBiserial) < 0.3
  );

  if (!problematic.length) {
    return (
      <Card className="border border-success bg-panel">
        <SectionHeader title="Бодлогын чанар" />
        <div className="flex gap-3">
          <div className="flex-shrink-0 text-success">
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <div className="font-medium text-ink">Бүх бодлого сайн байна</div>
            <div className="text-sm text-ink-dim">
              Бүх бодлого сурагчдыг сайн ялгаж чаддаг байгаа.
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <SectionHeader
        title="Анхааруулга: Бодлогын чанар"
        hint={<InfoHint>Point-biserial корреляцоор сурагчдыг ялгаж байгаа эсэхийг хэмждэг. 0.3-аас доош нь сөргүү гэсэн үг.</InfoHint>}
      />

      <div className="space-y-3">
        {problematic.map((prob) => (
          <div
            key={prob.problemId}
            className="p-4 bg-panel border-l-4 border-warning rounded space-y-2"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-ink">{prob.problemTitle}</div>
                <div className="text-xs text-ink-dim mb-2">{prob.topicName}</div>

                {prob.discrimination === "bad" && (
                  <div className="text-sm text-ink mb-2">
                    <strong>Асуудал:</strong> Энэ бодлого сургалтаа сайн гүйцэтгэсэн сурагчдыг
                    сөргүүлэхүүдээс ялгаж чаддаггүй байна. Бодлого эвдэрсэн байж болзошгүй.
                  </div>
                )}

                {prob.discrimination === "poor" && (
                  <div className="text-sm text-ink mb-2">
                    <strong>Анхааруулга:</strong> Энэ бодлого ялгах чадвар сул байна. Сайл хариулт
                    эсвэл хүрэнгэдэх жигдэрүүлэхийг анхаарна уу.
                  </div>
                )}

                <div className="text-xs text-ink-dim">
                  Оролцоо: {prob.totalAttempts}, Ялгах хүч:{" "}
                  <strong>{prob.pointBiserial.toFixed(3)}</strong>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-info bg-opacity-10 border border-info rounded text-sm text-ink">
        <strong>Сайн мэдээ:</strong> Эдгээр бодлогуудыг шалгаж, сайл хариулт эсвэл үг хэрэглээг
        засах замаар сайжруулж болно.
      </div>
    </Card>
  );
}

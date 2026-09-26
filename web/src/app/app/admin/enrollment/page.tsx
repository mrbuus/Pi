"use client";

import { useState } from "react";
import EnrollmentClient from "@/components/enrollment/EnrollmentClient";
import PendingApprovalList from "@/components/enrollment/PendingApprovalList";
import ExternalTeachersPanel from "@/components/enrollment/ExternalTeachersPanel";

type Tab = "windows" | "approval" | "external-teachers";

export default function EnrollmentAdminPage() {
  const [tab, setTab] = useState<Tab>("windows");

  return (
    <div className="min-h-screen bg-bg">
      {/* Табын төрлүүд */}
      <div className="border-b border-line">
        <div className="max-w-4xl mx-auto">
          <div
            role="tablist"
            aria-label="Элсэлтийн удирдлагын хэсгүүд"
            className="flex overflow-x-auto"
          >
            <button
              role="tab"
              aria-selected={tab === "windows"}
              onClick={() => setTab("windows")}
              className={`
                px-4 py-3 font-medium border-b-2 transition-colors
                ${
                  tab === "windows"
                    ? "border-brand text-brand"
                    : "border-transparent text-ink-dim hover:text-ink"
                }
              `}
            >
              Элсэлтийн цонхо
            </button>
            <button
              role="tab"
              aria-selected={tab === "approval"}
              onClick={() => setTab("approval")}
              className={`
                px-4 py-3 font-medium border-b-2 transition-colors
                ${
                  tab === "approval"
                    ? "border-brand text-brand"
                    : "border-transparent text-ink-dim hover:text-ink"
                }
              `}
            >
              Зөвшөөрөл хүлээгч
            </button>
            <button
              role="tab"
              aria-selected={tab === "external-teachers"}
              onClick={() => setTab("external-teachers")}
              className={`px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === "external-teachers"
                  ? "border-brand text-brand"
                  : "border-transparent text-ink-dim hover:text-ink"
              }`}
            >
              Гадны багш
            </button>
          </div>
        </div>
      </div>

      {/* Табын агуулга */}
      <div className="max-w-4xl mx-auto">
        {tab === "windows" && <EnrollmentClient />}
        {tab === "approval" && <PendingApprovalList />}
        {tab === "external-teachers" && <ExternalTeachersPanel />}
      </div>
    </div>
  );
}
